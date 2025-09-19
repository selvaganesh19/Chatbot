const MAX_CHARS = 2000;
// const API_URL = "http://127.0.0.1:5000/api/chat"; // Old Flask API
const GRADIO_URL = "selva1909/AI-chat-bot";
let gradioClient = null; // Will store the client instance

let chatBox, inputEl, sendBtn, themeToggle, characterCount;

// Chat history sent to backend
const history = [];
const gradioHistory = []; // For Gradio format

// Initialize Gradio client
async function initGradioClient() {
  try {
    gradioClient = await window.GradioClient.connect(GRADIO_URL);
    console.log("Gradio client connected successfully");
    return true;
  } catch (err) {
    console.error("Failed to connect to Gradio:", err);
    return false;
  }
}

// THEME
function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute("data-theme") || "light";
  const next = current === "light" ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  if (!themeToggle) return;
  themeToggle.innerHTML = theme === "dark"
    ? '<i class="fa-solid fa-sun"></i>'
    : '<i class="fa-solid fa-moon"></i>';
}

// Markdown -> safe HTML
function renderMarkdown(mdText) {
  try {
    if (window.marked && window.DOMPurify) {
      marked.setOptions({
        breaks: true,
        gfm: true,
      });
      const html = marked.parse(mdText || "");
      return DOMPurify.sanitize(html);
    }
  } catch {}
  // Fallback: simple newline handling
  const esc = (s) => (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[c]));
  return esc(mdText).replace(/\n/g, "<br>");
}

// MESSAGES
function createMessageElement(message, isUser = false) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${isUser ? "user-message" : "bot-message"}`;

  const avatar = document.createElement("div");
  avatar.className = isUser ? "user-avatar" : "bot-avatar";
  avatar.innerHTML = isUser ? '<i class="fa-regular fa-user"></i>' : '<i class="fa-solid fa-robot"></i>';

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = renderMarkdown(message);

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-button";
  copyBtn.type = "button";
  copyBtn.setAttribute("aria-label", "Copy message");
  copyBtn.setAttribute("data-tip", "Copy");
  copyBtn.innerHTML = '<i class="fa-regular fa-copy"></i><span class="copy-label">Copy</span>';
  copyBtn.addEventListener("click", () => copyMessage(message, copyBtn));
  content.appendChild(copyBtn);

  // Bot LEFT: avatar → content
  // User RIGHT: content → avatar
  if (isUser) {
    wrapper.appendChild(content);
    wrapper.appendChild(avatar);
  } else {
    wrapper.appendChild(avatar);
    wrapper.appendChild(content);
  }
  return wrapper;
}

function displayMessage(message, isUser = false) {
  const el = createMessageElement(message, isUser);
  chatBox.appendChild(el);
  scrollToBottom();
}

let typingEl = null;
function displayTypingIndicator() {
  removeTypingIndicator();
  typingEl = document.createElement("div");
  typingEl.className = "message bot-message";
  typingEl.innerHTML = `
    <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>
    <div class="message-content typing-indicator">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>`;
  chatBox.appendChild(typingEl);
  scrollToBottom();
}

function removeTypingIndicator() {
  if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
  typingEl = null;
}

function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// COPY
async function copyMessage(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i><span class="copy-label">Copied</span>';
    btn.classList.add("copied");
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.remove("copied");
    }, 1200);
  } catch {
    btn.innerHTML = '<i class="fa-solid fa-times"></i><span class="copy-label">Error</span>';
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-regular fa-copy"></i><span class="copy-label">Copy</span>';
    }, 1200);
  }
}

// INPUT
function updateCharacterCount() {
  if (!inputEl || !characterCount || !sendBtn) return;
  const len = inputEl.value.length;
  characterCount.textContent = `${len} / ${MAX_CHARS}`;
  sendBtn.disabled = len === 0 || len > MAX_CHARS;
}

function autoResizeTextarea() {
  if (!inputEl) return;
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
}

// SEND (updated to use Gradio)
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  displayMessage(text, true);
  
  // Store message in our app's history format
  history.push({ role: "user", content: text });
  
  // Convert to Gradio's expected format (pairs of messages)
  if (gradioHistory.length === 0 || gradioHistory[gradioHistory.length-1][0]) {
    gradioHistory.push([text, null]);
  } else {
    gradioHistory[gradioHistory.length-1][0] = text;
  }
  
  inputEl.value = "";
  updateCharacterCount();
  autoResizeTextarea();
  sendBtn.disabled = true;

  displayTypingIndicator();

  try {
    if (!gradioClient && !(await initGradioClient())) {
      // Fallback to local API if Gradio connection fails
      removeTypingIndicator();
      displayMessage("Could not connect to AI service. Please try again later.", false);
      console.error("Failed to initialize Gradio client");
      sendBtn.disabled = false;
      return;
    }
    
    // Call Gradio API
    const result = await gradioClient.predict("/user_submit", { 		
      user_message: text, 		
      chat_history: gradioHistory
    });
    
    console.log("Gradio response:", result.data); // Log the response as requested
    
    // Extract the reply (second element has the updated chat history)
    const reply = result.data[1][result.data[1].length - 1][1];
    
    // Update our gradio history format
    gradioHistory.pop(); // Remove the last [user, null] pair
    gradioHistory.push([text, reply]); // Add the complete pair
    
    removeTypingIndicator();
    displayMessage(reply, false);
    
    // Store assistant response in our history format too
    history.push({ role: "assistant", content: reply });
    
  } catch (e) {
    removeTypingIndicator();
    displayMessage("Network error. Please check your connection and try again.", false);
    console.error("Network error:", e);
  } finally {
    sendBtn.disabled = false;
  }
}

// BOOTSTRAP
document.addEventListener("DOMContentLoaded", async () => {
  chatBox = document.getElementById("chat-box");
  inputEl = document.getElementById("user-input");
  sendBtn = document.getElementById("send-btn");
  themeToggle = document.getElementById("theme-toggle");
  characterCount = document.querySelector(".character-count");

  initTheme();
  
  // Initialize Gradio client
  const connected = await initGradioClient();
  
  // Show appropriate welcome message
  if (connected) {
    try {
      // Try to get initial message from /lambda endpoint
      const initialResult = await gradioClient.predict("/lambda", {});
      console.log("Initial state:", initialResult.data);
      
      // Use the initial message or fallback
      const welcomeMsg = initialResult.data && initialResult.data[0] && initialResult.data[0][1]
        ? initialResult.data[0][1]
        : "Hi! I'm Selva's Chat Bot. Ask me anything!";
      
      displayMessage(welcomeMsg, false);
    } catch (err) {
      console.error("Error getting initial state:", err);
      displayMessage("Hi! I'm Selva's Chat Bot. Ask me anything!", false);
    }
  } else {
    displayMessage("Warning: Could not connect to AI service. Please check your connection.", false);
  }

  // Listeners
  themeToggle?.addEventListener("click", toggleTheme);
  sendBtn?.addEventListener("click", sendMessage);
  inputEl?.addEventListener("input", () => {
    updateCharacterCount();
    autoResizeTextarea();
  });
  inputEl?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Initialize after elements exist
  updateCharacterCount();
  autoResizeTextarea();
});
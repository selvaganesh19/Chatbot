const MAX_CHARS = 2000;
const API_URL = "/api/chat";

let chatBox, inputEl, sendBtn, themeToggle, characterCount;

// Chat history sent to backend
const history = [];

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
  // Bot is RIGHT: content then avatar
  typingEl.innerHTML = `
    <div class="message-content typing-indicator">
      <span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>
    </div>
    <div class="bot-avatar"><i class="fa-solid fa-robot"></i></div>`;
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
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1200);
  } catch {
    btn.textContent = "Error";
    setTimeout(() => (btn.textContent = "Copy"), 1200);
  }
}

// INPUT
function updateCharacterCount() {
  if (!inputEl || !characterCount || !sendBtn) return; // guard until DOM ready
  const len = inputEl.value.length;
  characterCount.textContent = `${len} / ${MAX_CHARS}`;
  sendBtn.disabled = len === 0 || len > MAX_CHARS;
}
function autoResizeTextarea() {
  if (!inputEl) return;
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 160) + "px";
}

// SEND
async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  displayMessage(text, true);
  history.push({ role: "user", content: text });
  inputEl.value = "";
  updateCharacterCount();
  autoResizeTextarea();
  sendBtn.disabled = true;

  displayTypingIndicator();

  try {
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history }),
    });

    let data = {};
    try { data = await res.json(); } catch {}

    if (!res.ok) {
      const msg =
        data?.error ||
        (res.status === 401
          ? "Invalid API key. Check your .env and restart the server."
          : res.status === 402
          ? "Billing required or quota exceeded. Use a free model or add credit."
          : `Request failed (HTTP ${res.status}).`);
      removeTypingIndicator();
      displayMessage(msg, false);
      return;
    }

    const reply = data.reply || "Sorry, I couldn't get a response.";
    removeTypingIndicator();
    displayMessage(reply, false);
    history.push({ role: "assistant", content: reply });
  } catch (e) {
    removeTypingIndicator();
    displayMessage("Network error. Please try again.", false);
    console.error(e);
  } finally {
    sendBtn.disabled = false;
  }
}

// BOOTSTRAP
document.addEventListener("DOMContentLoaded", () => {
  chatBox = document.getElementById("chat-box");
  inputEl = document.getElementById("user-input");
  sendBtn = document.getElementById("send-btn");
  themeToggle = document.getElementById("theme-toggle");
  characterCount = document.querySelector(".character-count");

  initTheme();
  displayMessage("Hi! Ask me anything.", false);

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

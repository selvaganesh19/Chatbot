const chatBox = document.getElementById("chat-box");

function sendMessage() {
    const userInput = document.getElementById("user-input").value;

    if (userInput.trim() === "") {
        return;  // Prevent sending empty messages
    }

    // Display user's message
    displayMessage(userInput, "user-message");

    // Simulate a bot response
    setTimeout(() => {
        const botResponse = getBotResponse(userInput);
        displayBotMessage(botResponse);
    }, 700);  // Delay bot response for a natural feel

    // Clear the input field
    document.getElementById("user-input").value = "";
}

function displayMessage(message, className) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);
    messageElement.innerText = message;
    chatBox.appendChild(messageElement);
    chatBox.scrollTop = chatBox.scrollHeight;  
}

function displayBotMessage(message) {
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("message", "bot-message");

    const avatar = document.createElement("img");
    avatar.src = "images.png";  
    avatar.classList.add("bot-avatar");

    const messageText = document.createElement("div");
    messageText.innerText = message;

    messageContainer.appendChild(avatar);
    messageContainer.appendChild(messageText);

    chatBox.appendChild(messageContainer);
    chatBox.scrollTop = chatBox.scrollHeight;  
}

function getBotResponse(userInput) {
    const responses = {
        "hello": "Hello! How can I assist you?",
        "hi": "Hi there! How can I help you?",
        "bye": "Goodbye! ",
        "how are you": "I'm a bot, but I'm doing great! How about you?",
        "tell my name": "Your name is Selva",
        "tell my friends name": "Your friends name is Maria,Logesh,Surya,Pranesh",
        "tell my date of birth": "Selva is landed on the earth on 19 september 2004 at 7:19 P.M",
    };

    return responses[userInput.toLowerCase()] || "I'm sorry, I don't understand that.";
}

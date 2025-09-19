# Chatbot

# 🤖 Chatbot

Welcome to **Chatbot** – an open-source project for building conversational AI applications!  
Whether you’re a developer seeking to integrate chat experiences into your apps, or just curious about conversational AI, Chatbot provides a backend and frontend framework to get started quickly.

---

## 📄 Description

[Project Link](Link)

---

## 🏷️ Topics

- Conversational AI
- Chatbot
- Flask
- Gradio
- JavaScript
- Web Application

---

## ✨ Features

- **Backend API:** Built with Flask, handles chat requests and responses.
- **Frontend UI:** Modern, interactive chat interface using plain JavaScript.
- **Gradio Integration:** Optionally connects to Gradio-based AI models for responses.
- **Environment Variables:** Secure API key management with `.env` support.
- **CORS Enabled:** Easily connect frontend and backend locally or remotely.
- **Character Count:** Limits messages to a configurable number of characters.

---

## 🚀 Installation

### Prerequisites

- Python 3.8+
- Node.js (for serving frontend, optional)
- [pip](https://pip.pypa.io/en/stable/)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Chatbot.git
cd Chatbot
```

### 2. Set Up Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file and add your API keys:
```ini
OPENROUTER_API_KEY=your-api-key-here
OPENROUTER_MODEL=your-model-name
```

### 3. Run Backend Server

```bash
python app.py
```

### 4. Set Up Frontend

No build step is required. Just open `frontend/index.html` in your browser.

---

## 💡 Usage

1. **Start the Backend:** Ensure your Flask backend is running.
2. **Access the Frontend:** Open `frontend/index.html` in your browser.
3. **Chat Away:** Type your message and hit send. The chatbot will reply using the integrated AI model.

**Tip:**  
You may need to adjust the API URLs in `frontend/script.js` if you're running the backend on a different host or port.

---

## 🤝 Contributing

We welcome contributions!  
To contribute:

1. Fork the repo
2. Create a new branch (`git checkout -b feature/your-feature`)
3. Commit your changes
4. Push to your branch and open a Pull Request

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## 📜 License

This project is licensed under the [MIT License](LICENSE).

---

> _Built with ❤️ by the Chatbot community._

---

**File Overview:**
- `backend/app.py`: Flask API for chat messages.
- `frontend/script.js`: Handles chat UI and Gradio integration.

---

For questions or support, please open an issue!

## License
This project is licensed under the **MIT** License.

---
🔗 GitHub Repo: https://github.com/selvaganesh19/Chatbot
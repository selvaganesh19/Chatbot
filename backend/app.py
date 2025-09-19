import os
import traceback
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
# Load environment variables
load_dotenv()

# Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL")
APP_TITLE = os.getenv("APP_TITLE", "Selva Chat Bot")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Create Flask app
app = Flask(__name__)

# Enable CORS for all routes
CORS(app, origins=["*"])

@app.route("/")
def root():
    return jsonify({"message": "Selva Chat Bot API", "status": "running"})


@app.route("/health")
def health():
    redacted = OPENROUTER_API_KEY[:8] + "..." if OPENROUTER_API_KEY else ""
    return jsonify({"ok": True, "model": OPENROUTER_MODEL, "key": redacted})

@app.route("/api/chat", methods=["POST"])
def chat():
    try:
        payload = request.get_json(silent=True) or {}
        user_message = (payload.get("message") or "").strip()
        history = payload.get("history") or []

        if not user_message:
            return jsonify({"error": "Message is required"}), 400

        if not OPENROUTER_API_KEY:
            return jsonify({"error": "API key not configured"}), 500

        # Build messages array
        messages = []
        if not any(m.get("role") == "system" for m in history):
            messages.append({
                "role": "system",
                "content": "You are a helpful, concise, and friendly assistant for Selva's Chat-Bot."
            })
        
        # Add valid history messages
        messages.extend([m for m in history if m.get("role") in ("system", "user", "assistant")])
        messages.append({"role": "user", "content": user_message})

        # API request
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "X-Title": APP_TITLE,
        }

        body = {
            "model": OPENROUTER_MODEL,
            "messages": messages,
            "temperature": 0.7,
            "max_tokens": 1000
        }

        response = requests.post(
            OPENROUTER_URL, 
            headers=headers, 
            json=body, 
            timeout=30
        )

        if response.status_code != 200:
            error_data = response.json() if response.headers.get('content-type') == 'application/json' else {"error": response.text}
            error_message = error_data.get("error", {}).get("message", "API request failed") if isinstance(error_data.get("error"), dict) else str(error_data.get("error", "Unknown error"))
            return jsonify({"error": error_message}), response.status_code

        data = response.json()
        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "Sorry, I couldn't generate a response.")
        )

        return jsonify({"reply": reply})

    except requests.exceptions.Timeout:
        return jsonify({"error": "Request timeout. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        return jsonify({"error": "Failed to connect to AI service."}), 503
    except Exception as e:
        print(f"Unexpected error: {e}")
        traceback.print_exc()
        return jsonify({"error": "Internal server error."}), 500

# For Vercel deployment
application = app

if __name__ == "__main__":
    app.run(port=5000, debug=True)
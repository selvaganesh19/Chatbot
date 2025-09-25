import os
import traceback
import requests
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from the backend folder
env_path = Path(__file__).parent / '.env'
load_dotenv(dotenv_path=env_path)

# Configuration
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free")
APP_TITLE = os.getenv("APP_TITLE", "Selva Chat Bot")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

print(f"Loaded API key: {OPENROUTER_API_KEY[:10]}..." if OPENROUTER_API_KEY else "No API key found")
print(f"Using model: {OPENROUTER_MODEL}")

app = Flask(__name__)
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
        print("=== NEW CHAT REQUEST ===")
        
        # Log incoming request
        payload = request.get_json(silent=True) or {}
        print(f"Received payload: {json.dumps(payload, indent=2)}")
        
        user_message = (payload.get("message") or "").strip()
        history = payload.get("history") or []
        
        print(f"User message: '{user_message}'")
        print(f"History length: {len(history)}")

        if not user_message:
            print("ERROR: No message provided")
            return jsonify({"error": "Message is required"}), 400

        if not OPENROUTER_API_KEY:
            print("ERROR: No API key configured")
            return jsonify({"error": "API key not configured"}), 500

        # Build messages array
        messages = []
        if not any(m.get("role") == "system" for m in history):
            messages.append({
                "role": "system",
                "content": "You are a helpful, concise, and friendly assistant for Selva's Chat-Bot."
            })
        
        messages.extend([m for m in history if m.get("role") in ("system", "user", "assistant")])
        messages.append({"role": "user", "content": user_message})
        
        print(f"Final messages array: {json.dumps(messages, indent=2)}")

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
        
        print(f"Request headers: {headers}")
        print(f"Request body: {json.dumps(body, indent=2)}")
        print(f"Making request to: {OPENROUTER_URL}")

        response = requests.post(
            OPENROUTER_URL, 
            headers=headers, 
            json=body, 
            timeout=30
        )

        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        print(f"Response text: {response.text}")

        if response.status_code != 200:
            try:
                error_data = response.json()
                print(f"Error data parsed: {json.dumps(error_data, indent=2)}")
            except:
                error_data = {"error": response.text}
                print(f"Could not parse error as JSON: {response.text}")
            
            error_message = "API request failed"
            if isinstance(error_data.get("error"), dict):
                error_message = error_data["error"].get("message", error_message)
            elif isinstance(error_data.get("error"), str):
                error_message = error_data["error"]
            
            print(f"Returning error: {error_message}")
            return jsonify({"error": error_message}), response.status_code

        try:
            data = response.json()
            print(f"Success response data: {json.dumps(data, indent=2)}")
        except:
            print(f"Could not parse success response as JSON: {response.text}")
            return jsonify({"error": "Invalid response from AI service"}), 502

        reply = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "Sorry, I couldn't generate a response.")
        )
        
        print(f"Extracted reply: '{reply}'")
        print("=== REQUEST COMPLETE ===")

        return jsonify({"reply": reply})

    except requests.exceptions.Timeout:
        print("ERROR: Request timeout")
        return jsonify({"error": "Request timeout. Please try again."}), 504
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Request exception: {e}")
        return jsonify({"error": "Failed to connect to AI service."}), 503
    except Exception as e:
        print(f"ERROR: Unexpected error: {e}")
        print(f"ERROR: Full traceback:")
        traceback.print_exc()
        return jsonify({"error": "Internal server error."}), 500

application = app

if __name__ == "__main__":
    app.run(port=5000, debug=True)
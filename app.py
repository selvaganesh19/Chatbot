import os
import json
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional

import requests
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv

# Load .env, but it won't be used in production (Vercel uses environment variables)
load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

# Get API key - in production this comes from Vercel environment
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free")
APP_TITLE = os.getenv("APP_TITLE", "Selva Chat Bot")
ORIGIN = os.getenv("ORIGIN", "https://chatbot-selvaganesh19.vercel.app")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Create the app at module level
app = Flask(__name__, static_folder=".")

@app.get("/")
def root():
    return send_from_directory(".", "index.html")

@app.get("/favicon.ico")
def favicon():
    return ("", 204)

@app.get("/health")
def health():
    redacted = OPENROUTER_API_KEY[:8] + "..." if OPENROUTER_API_KEY else ""
    return {"ok": True, "model": OPENROUTER_MODEL, "key": redacted}

@app.post("/api/chat")
def chat() -> Any:
    payload = request.get_json(silent=True) or {}
    user_message: str = (payload.get("message") or "").strip()
    history: Optional[List[Dict[str, str]]] = payload.get("history") or []

    if not user_message:
        return jsonify({"error": "message is required"}), 400

    # Compose messages with a single system prompt
    messages: List[Dict[str, str]] = []
    if not any(m.get("role") == "system" for m in history):
        messages.append({
            "role": "system",
            "content": "You are a concise, friendly assistant for Selva's Chat-Bot.",
        })
    messages.extend([m for m in history if m.get("role") in ("system", "user", "assistant")])
    messages.append({"role": "user", "content": user_message})

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": ORIGIN,
        "X-Title": APP_TITLE,
    }
    body = {
        "model": OPENROUTER_MODEL,  # e.g., "openai/gpt-oss-20b:free" (default) or "openai/gpt-5" if you have access
        "messages": messages,
    }

    try:
        resp = requests.post(OPENROUTER_URL, headers=headers, data=json.dumps(body), timeout=60)
        if resp.status_code != 200:
            # Forward OpenRouter error to the client with the same status
            try:
                err = resp.json()
            except Exception:
                err = {"error": resp.text}
            # Friendlier messages for common cases
            msg = err.get("error") if isinstance(err, dict) else err
            if isinstance(msg, dict):
                msg = msg.get("message", str(msg))
            return jsonify({"error": msg}), resp.status_code

        data = resp.json()
        reply = (
            data.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "Sorry, I couldn't get a response.")
        )
        return jsonify({"reply": reply})
    except Exception as e:
        print("Error calling OpenRouter:", e)
        traceback.print_exc()
        return jsonify({"error": "Server error contacting OpenRouter."}), 500

# This special file helps Vercel find your API endpoint
from ..app import app as application

# Only used for local development
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
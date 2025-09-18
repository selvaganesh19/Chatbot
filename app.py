import os
import json
import traceback
from pathlib import Path
from typing import List, Dict, Any, Optional

import requests
from flask import Flask, request, jsonify, send_from_directory
from dotenv import load_dotenv, dotenv_values

DOTENV_PATH = Path(__file__).with_name(".env")

# Ensure .env overrides any previously set env vars (e.g., from setx)
load_dotenv(dotenv_path=DOTENV_PATH, override=True)

# Sanitize and validate key
raw_key = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_API_KEY = raw_key.strip().strip('"').strip("'")

# For debugging: compare what's in .env to what's loaded
envfile_key = (dotenv_values(DOTENV_PATH).get("OPENROUTER_API_KEY") or "").strip().strip('"').strip("'")
env_matches_dotenv = (OPENROUTER_API_KEY[:10] == envfile_key[:10] != "")

if not OPENROUTER_API_KEY or not OPENROUTER_API_KEY.startswith("sk-or-"):
    raise RuntimeError("OPENROUTER_API_KEY missing/invalid. Put it in .env without quotes (starts with sk-or-).")

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-oss-20b:free")
APP_TITLE = os.getenv("APP_TITLE", "Selva Chat Bot")
ORIGIN = os.getenv("ORIGIN", "http://localhost:5000")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

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
    return {"ok": True, "model": OPENROUTER_MODEL, "key": redacted, "env_matches_dotenv": env_matches_dotenv}

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
            if resp.status_code == 401 or (isinstance(msg, str) and "User not found" in msg):
                msg = "Invalid OpenRouter API key. Make sure your .env is used (override=True) and rotate the key."
            elif resp.status_code == 402:
                msg = "OpenRouter billing required or quota exceeded. Use a free model or add credit."
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

# Keep this exactly as is for local dev, Vercel ignores it
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
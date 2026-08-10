"""
שרת Python (Flask) שמחבר בין "ימות המשיח" (Yemot HaMashiach IVR) לבין Grok
==========================================================================
זרימה:
1. המשתמש מקליט הודעה בשלוחה בימות.
2. ימות שולח בקשת webhook לכתובת הזו (מוגדר בשלוחת type=api).
3. אנחנו מורידים את קובץ ההקלטה מהשרת של ימות (DownloadFile API).
4. שולחים את הקובץ לתמלול (STT) - כאן דרך OpenAI Whisper.
5. שולחים את הטקסט המתומלל ל-Grok (xAI) ומקבלים תשובה.
6. מחזירים לימות תשובה בפורמט שהוא יודע להקריא (TTS מובנה, קידומת t-).

התקנה:
    pip install flask requests --break-system-packages

הרצה:
    export YEMOT_TOKEN="0773137770:123456"
    export OPENAI_API_KEY="sk-xxx"
    export GROK_API_KEY="xai-xxx"
    python server.py
"""

import os
import io
import urllib.parse

import requests
from flask import Flask, request, Response

app = Flask(__name__)

YEMOT_TOKEN = os.environ.get("YEMOT_TOKEN")  # "מספר_מערכת:סיסמה"
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
GROK_API_KEY = os.environ.get("GROK_API_KEY")
YEMOT_API_BASE = "https://www.call2all.co.il/ym/api"


# ---------- שלב 1: הורדת ההקלטה מימות ----------
def download_recording_from_yemot(recording_path: str) -> bytes:
    # recording_path מגיע מימות בפורמט כמו: /1/1/12345.wav (או ivr2:/1/1/12345.wav)
    url = (
        f"{YEMOT_API_BASE}/DownloadFile"
        f"?token={urllib.parse.quote(YEMOT_TOKEN)}"
        f"&path={urllib.parse.quote(recording_path)}"
    )
    resp = requests.get(url, timeout=20)
    if resp.status_code != 200:
        raise RuntimeError(f"נכשלה הורדת ההקלטה מימות: {resp.status_code}")
    return resp.content  # WAV binary


# ---------- שלב 2: תמלול (STT) ----------
def transcribe_audio(audio_bytes: bytes) -> str:
    files = {
        "file": ("recording.wav", io.BytesIO(audio_bytes), "audio/wav"),
    }
    data = {
        "model": "whisper-1",
        "language": "he",  # עברית
    }
    headers = {"Authorization": f"Bearer {OPENAI_API_KEY}"}

    resp = requests.post(
        "https://api.openai.com/v1/audio/transcriptions",
        headers=headers,
        data=data,
        files=files,
        timeout=60,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"שגיאת תמלול: {resp.status_code} {resp.text}")

    return resp.json()["text"]


# ---------- שלב 3: שליחה ל-Grok ----------
def ask_grok(user_text: str) -> str:
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": "grok-4",  # עדכן לפי המודל הזמין אצלך ב-x.ai
        "messages": [
            {
                "role": "system",
                "content": "ענה בקצרה ובעברית תקנית, מותאם להשמעה קולית בטלפון.",
            },
            {"role": "user", "content": user_text},
        ],
    }

    resp = requests.post(
        "https://api.x.ai/v1/chat/completions",
        headers=headers,
        json=payload,
        timeout=30,
    )
    if resp.status_code != 200:
        raise RuntimeError(f"שגיאת Grok: {resp.status_code} {resp.text}")

    return resp.json()["choices"][0]["message"]["content"]


# ---------- עוזר: הכנת מחרוזת תשובה תקנית לימות ----------
def build_yemot_tts_response(text: str) -> str:
    # ימות דורש תשובה כ-query string, לא JSON.
    # t- הוא קידומת שגורמת למערכת להקריא את הטקסט עם ה-TTS המובנה שלה (תומך עברית).
    # שימו לב: בפורמט הרשמי של ימות "." משמש כתו הפרדה בין רכיבים בתוך id_list_message,
    # לכן מומלץ להסיר/להחליף נקודות בטקסט לפני שליחתו כדי למנוע פירוק שגוי של המחרוזת.
    safe_text = text.replace(".", " ")  # מומלץ לבדוק ולהתאים בהתאם לבדיקות אצלכם
    return f"id_list_message=t-{urllib.parse.quote(safe_text)}"


# ---------- הנקודה שימות פונה אליה (Webhook) ----------
@app.route("/yemot-ai", methods=["GET", "POST"])
def yemot_ai():
    params = {**request.args.to_dict(), **request.form.to_dict()}

    # שם הפרמטר תלוי איך הגדרתם את שלוחת ה-API בימות (סוג שאלה = הקלטה, ושם ערך).
    # לדוגמה אם הגדרתם val_name=recording, הנתיב יגיע כ- recording=/1/1/xxxxx.wav
    recording_path = params.get("recording")

    if not recording_path:
        return Response(
            "id_list_message=t-לא התקבלה הקלטה, אנא נסו שוב",
            mimetype="text/plain",
        )

    try:
        audio_bytes = download_recording_from_yemot(recording_path)
        transcribed_text = transcribe_audio(audio_bytes)
        grok_answer = ask_grok(transcribed_text)
        response_str = build_yemot_tts_response(grok_answer)
        return Response(response_str, mimetype="text/plain")
    except Exception as e:  # noqa: BLE001
        print(f"Error: {e}")
        return Response(
            "id_list_message=t-אירעה שגיאה, אנא נסו שוב מאוחר יותר",
            mimetype="text/plain",
        )


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    app.run(host="0.0.0.0", port=port)

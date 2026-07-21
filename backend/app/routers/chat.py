import os
import json
import requests
from datetime import datetime
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from ..database import db_session

router = APIRouter(prefix="/api/chat", tags=["chat"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")

LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi",
    "hinglish": "Hinglish (Roman-script mixed Hindi-English, like everyday chat)",
    "ta": "Tamil",
    "te": "Telugu",
    "bn": "Bengali",
    "mr": "Marathi",
    "es": "Spanish",
    "fr": "French",
}

BASE_SYSTEM_PROMPT = """You are "Style Buddy", the in-app AI shopping assistant for an online fashion store \
themed like Myntra. You ONLY discuss fashion, clothing, sizing, styling, fabric/material, care instructions, \
outfit pairing, and the store's products/orders/reviews. If asked something unrelated to fashion or shopping \
on this site, politely redirect the user back to fashion topics in one short sentence.

Keep replies short, warm, and conversational (2-5 sentences unless the user asks for a detailed comparison). \
Use the product context (if provided) to answer specifically — cite real details like price, material, \
sizing pattern from past orders, and review sentiment rather than generic advice. \
If no product context is given, answer generally about fashion/styling or ask which product they're viewing.

You can also tell the user about two special tools available in this app, and suggest them when relevant:
1. "Get my size" — the user takes a front and side shot with their own camera (nothing is uploaded or \
saved - the frame is processed and discarded immediately) plus their height, and it estimates their \
measurements (chest, waist, hips, shoulders, inseam) in inches, shown as adjustable sliders so they can \
fine-tune before saving that profile under a name (e.g. "Me", "Mom") for later use.
2. "Visualise & Compare" — shows a silhouette of a saved person's body shape overlaid with the currently \
viewed product's cut, and optionally a second product (found via a quick in-chat search) side by side, so \
they can see whether either one runs loose or snug.
Only mention these when the user is asking about fit, sizing, or how something would look/fit on them.
"""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    product_id: Optional[int] = None
    language: Optional[str] = "en"
    history: Optional[List[ChatMessage]] = None


def _fetch_product_context(product_id: int) -> Optional[dict]:
    with db_session() as conn:
        row = conn.execute(
            """SELECT p.*, b.name AS brand_name FROM products p
               JOIN brands b ON b.id = p.brand_id WHERE p.id = ?""",
            (product_id,),
        ).fetchone()
        if not row:
            return None
        reviews = conn.execute(
            "SELECT rating, title, comment, size_bought, fit_feedback FROM reviews WHERE product_id = ? ORDER BY created_at DESC LIMIT 6",
            (product_id,),
        ).fetchall()
        size_counts = conn.execute(
            "SELECT size_ordered, COUNT(*) c FROM past_orders WHERE product_id = ? GROUP BY size_ordered ORDER BY c DESC",
            (product_id,),
        ).fetchall()
        rating = conn.execute(
            "SELECT ROUND(AVG(rating),1) avg_rating, COUNT(*) total FROM reviews WHERE product_id = ?",
            (product_id,),
        ).fetchone()

    return {
        "name": row["name"],
        "brand": row["brand_name"],
        "category": row["category"],
        "price": row["price"],
        "mrp": row["mrp"],
        "material": row["material"],
        "quality_notes": row["quality_notes"],
        "sizes_available": row["sizes_available"],
        "colors_available": row["colors_available"],
        "rating_avg": rating["avg_rating"],
        "rating_count": rating["total"],
        "size_distribution": [{"size": r["size_ordered"], "orders": r["c"]} for r in size_counts],
        "recent_reviews": [dict(r) for r in reviews],
    }


def _build_system_prompt(product_ctx: Optional[dict], language: str) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    prompt = BASE_SYSTEM_PROMPT + f"\n\nRespond in {lang_name}, regardless of what language the user typed in."
    if product_ctx:
        prompt += "\n\nThe user is currently viewing this exact product:\n" + json.dumps(product_ctx, indent=2)
    else:
        prompt += "\n\nThe user is not currently viewing a specific product."
    return prompt


@router.get("/languages")
def list_languages():
    return [{"code": k, "label": v} for k, v in LANGUAGE_NAMES.items()]


@router.get("/suggestions")
def template_questions(product_id: Optional[int] = None):
    if product_id:
        return {
            "questions": [
                "Will this run true to size for me?",
                "What's this fabric like — breathable or warm?",
                "What do buyers say about the fit?",
                "What can I pair this with?",
                "Help me pick my size",
                "Visualise & compare this on me",
            ]
        }
    return {
        "questions": [
            "What's trending right now?",
            "Help me find an outfit for a wedding",
            "How do I know my correct size?",
            "What's the difference between slim-fit and relaxed-fit?",
            "Show me how the fit visualiser works",
        ]
    }


@router.post("")
def chat(req: ChatRequest):
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=503,
            detail="GROQ_API_KEY is not configured on the server. Add it to backend/.env to enable the chatbot.",
        )

    product_ctx = _fetch_product_context(req.product_id) if req.product_id else None
    system_prompt = _build_system_prompt(product_ctx, req.language or "en")

    messages = [{"role": "system", "content": system_prompt}]
    if req.history:
        for m in req.history[-10:]:
            messages.append({"role": m.role, "content": m.content})
    messages.append({"role": "user", "content": req.message})

    try:
        resp = requests.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json={"model": GROQ_MODEL, "messages": messages, "temperature": 0.6, "max_tokens": 500},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        reply = data["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {e}")

    now = datetime.utcnow().isoformat()
    with db_session() as conn:
        conn.execute(
            "INSERT INTO chat_messages (session_id, role, content, product_id, created_at) VALUES (?,?,?,?,?)",
            (req.session_id, "user", req.message, req.product_id, now),
        )
        conn.execute(
            "INSERT INTO chat_messages (session_id, role, content, product_id, created_at) VALUES (?,?,?,?,?)",
            (req.session_id, "assistant", reply, req.product_id, now),
        )

    return {"reply": reply, "product_context_used": product_ctx is not None}


@router.get("/history/{session_id}")
def get_history(session_id: str):
    with db_session() as conn:
        rows = conn.execute(
            "SELECT role, content, product_id, created_at FROM chat_messages WHERE session_id = ? ORDER BY id",
            (session_id,),
        ).fetchall()
    return {"messages": [dict(r) for r in rows]}

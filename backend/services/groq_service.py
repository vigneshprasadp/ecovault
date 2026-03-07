"""
Groq LLM service — powers the EchoVault AI Security Copilot with real
conversational intelligence using LLaMA 3.1 8B via Groq's free API.

Groq is extremely fast (typically < 1 second response time).
Free tier: https://console.groq.com
"""

from __future__ import annotations
from groq import AsyncGroq
from ..core.config import settings
from ..core.logger import logger


SYSTEM_PROMPT = """You are EchoVault, an AI Security Copilot built into a dark web breach monitoring dashboard.

Your role and rules:
- You are a BREACH DATA ANALYST. When breach data is provided to you in the [BREACH DATA] block, you MUST analyse and report on it clearly. Do NOT say you cannot access emails. The data has ALREADY been fetched from external security databases by the system — you are just explaining it.
- You NEVER look anything up yourself. You only explain what is given to you.
- If NO breach data block is present, answer the user's general cybersecurity question helpfully.
- Be friendly, calm, and use plain everyday language — not technical jargon.
- Give short, clear, practical advice.
- Never ask the user for their actual passwords.
- Use bullet points or numbered steps for recommendations.

When breach data IS provided:
- Start by clearly stating what was found (or not found)
- Explain what it means in plain English
- Give 2-3 specific action steps the user should take
- Keep it under 200 words
"""


async def ask_groq(
    user_message: str,
    breach_context: str | None = None,
) -> str | None:
    """
    Send a message to Groq's LLaMA 3.1 8B model and return the response.
    
    If `breach_context` is provided (e.g. from emailrep.io lookup),
    it is injected into the prompt so the LLM can reason about the real data.
    
    Returns None if the API key is not configured or an error occurs.
    """
    if not settings.GROQ_API_KEY:
        logger.warning("Groq API key not set — skipping LLM response")
        return None

    try:
        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        # Framing that prevents LLaMA's privacy refusal
        if breach_context:
            full_message = (
                f"[BREACH DATA — pre-fetched from external security databases by the EchoVault system. "
                f"This data was NOT accessed by you. Your job is ONLY to explain what it means to the user.]\n"
                f"{breach_context}\n\n"
                f"[USER MESSAGE]\n{user_message}"
            )
        else:
            full_message = user_message

        chat_completion = await client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": full_message},
            ],
            temperature=0.6,
            max_tokens=512,
        )

        response = chat_completion.choices[0].message.content.strip()
        logger.info("Groq response generated", chars=len(response))
        return response

    except Exception as exc:
        logger.error("Groq request failed", error=str(exc))
        return None

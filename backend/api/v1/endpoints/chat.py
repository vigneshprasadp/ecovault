import re
from fastapi import APIRouter, Depends, HTTPException, Request
from ....core.models import ChatRequest, ChatResponse
from ....services.model_loader import ModelService
from ....services.hibp_service import lookup_email
from ....services.groq_service import ask_groq
from ....api.dependencies import get_model_service, limiter
from ....core.logger import logger

router = APIRouter(prefix="/chat", tags=["Chat"])


@router.post("/", response_model=ChatResponse, summary="Natural-language breach risk chat")
@limiter.limit("20/minute")
async def chat(
    request: Request,
    req: ChatRequest,
    svc: ModelService = Depends(get_model_service),
):
    """
    4-tier pipeline:
      1. Email detected → emailrep.io live lookup
         → feed result as context to Groq LLM for natural language response
      2. No email / emailrep failed → Groq LLM answers directly (general questions)
      3. Groq unavailable → local NLP fallback (NER + TF-IDF)
    """
    try:
        user_input = req.user_input.strip()

        # ── 1. Detect email & run live lookup ─────────────────────────────────
        emails_in_query = re.findall(r"[\w\.\-]+@[\w\.\-]+", user_input)
        hibp_result = None
        breach_context: str | None = None
        risk = 0.05

        if emails_in_query:
            hibp_result = await lookup_email(emails_in_query[0].lower())

        # ── 2. Build breach context for Groq (only on hard confirmed signals) ──
        if hibp_result is not None:
            target_email = emails_in_query[0].lower()

            if hibp_result.get("error"):
                return ChatResponse(
                    response=f"Hmm, I wasn't able to look up **{target_email}**. It doesn't look like a valid email address. Could you double-check it?",
                    risk=0.0
                )

            # Hard breach signals from emailrep
            creds_leaked  = hibp_result.get("credentials_leaked", False)
            confirmed_breach = hibp_result.get("data_breach", False)

            # Cross-check local synthetic CSV (exact email match only)
            local_match = None
            try:
                df = svc._breaches_df
                rows = df[df["email"].str.lower() == target_email]
                if not rows.empty:
                    row = rows.iloc[0]
                    local_match = {
                        "company":      row.get("company", "Unknown"),
                        "breach_type":  row.get("breach_type", "Unknown"),
                        "severity":     float(row.get("severity", 0)),
                        "records_lost": int(row.get("records_lost", 0)),
                    }
            except Exception:
                pass

            # Determine if we have any HARD evidence of a breach
            has_hard_evidence = creds_leaked or confirmed_breach or (local_match is not None)

            if has_hard_evidence:
                # Compute risk only when there is real evidence
                risk = hibp_result.get("risk_score", 0.05)
                local_note = ""
                if local_match:
                    local_note = (
                        f"Internal database match: YES — email linked to {local_match['company']} breach "
                        f"(type: {local_match['breach_type']}, severity: {local_match['severity']:.2f}, "
                        f"records exposed: {local_match['records_lost']:,})\n"
                    )
                    if not confirmed_breach and local_match["severity"] > 0.4:
                        risk = max(risk, round(local_match["severity"] * 0.8, 3))

                breach_context = (
                    f"Email checked: {target_email}\n"
                    f"Credentials leaked: {creds_leaked}\n"
                    f"Confirmed data breach: {confirmed_breach}\n"
                    f"Linked platforms: {', '.join(hibp_result.get('profiles', [])) or 'none'}\n"
                    f"{local_note}"
                    f"Overall risk score: {risk} (0 = safe, 1 = critical)\n"
                    f"VERDICT: This email HAS confirmed breach signals. Report this clearly."
                )
            else:
                # No hard evidence — email is clean, pass a clean context so Groq doesn't guess
                risk = 0.03
                breach_context = (
                    f"Email checked: {target_email}\n"
                    f"Credentials leaked: False\n"
                    f"Confirmed data breach: False\n"
                    f"Internal database match: None\n"
                    f"Risk score: {risk}\n"
                    f"VERDICT: No confirmed breach signals found for this email. Tell the user it looks safe."
                )



        # ── 3. Ask Groq LLM (primary — handles both email + general questions) ─
        groq_response = await ask_groq(user_input, breach_context=breach_context)
        if groq_response:
            return ChatResponse(response=groq_response, risk=risk)

        # ── 4. Local fallback pipeline (NER + TF-IDF) — if Groq is down ───────
        local_response, local_risk = svc.chat_query(user_input)
        return ChatResponse(response=local_response, risk=local_risk)

    except Exception as exc:
        logger.error("Chat failed", input=req.user_input[:80], error=str(exc))
        raise HTTPException(status_code=500, detail="Chat service error")

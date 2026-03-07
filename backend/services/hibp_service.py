"""
EmailRep.io integration — completely FREE, no API key required for basic use.
Rate limit: ~100 requests/day on the free tier.

Endpoint: https://emailrep.io/{email}
Docs:      https://docs.emailrep.io/

Returns real breach intelligence:
  - credentials_leaked: whether credentials appeared in a data dump
  - data_breach: whether the email was part of a known breach
  - reputation: low / medium / high / none
  - suspicious: bool
  - references: number of public references found for this email
"""

from __future__ import annotations
import httpx
from ..core.logger import logger

EMAILREP_URL = "https://emailrep.io/{email}"


async def lookup_email(email: str) -> dict | None:
    """
    Query emailrep.io for free breach intelligence on an email address.

    Returns a structured dict or None if the service is unreachable.
    """
    headers = {
        "User-Agent": "EchoVault-DarkWebIntel/1.0",
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(
                EMAILREP_URL.format(email=email),
                headers=headers,
            )

        if resp.status_code == 400:
            logger.warning("EmailRep: invalid email format", email=email)
            return {"found": False, "email": email, "error": "Invalid email format"}

        if resp.status_code == 429:
            logger.warning("EmailRep: rate limit hit — falling back to local model")
            return None

        if resp.status_code != 200:
            logger.warning("EmailRep: unexpected status", status=resp.status_code)
            return None

        data = resp.json()
        details = data.get("details", {})

        credentials_leaked = details.get("credentials_leaked", False)
        data_breach = details.get("data_breach", False)
        reputation = data.get("reputation", "none")          # low / medium / high / none
        suspicious = data.get("suspicious", False)
        references = data.get("references", 0)
        profiles = details.get("profiles", [])               # ["twitter", "github", ...]
        last_seen = details.get("last_seen", "unknown")

        # Compute risk score from the free signals
        risk = 0.05
        if credentials_leaked:
            risk += 0.45
        if data_breach:
            risk += 0.30
        if suspicious:
            risk += 0.15
        if reputation == "low":
            risk += 0.10
        elif reputation == "medium":
            risk += 0.05
        risk = round(min(risk, 1.0), 3)

        logger.info("EmailRep lookup complete", email=email, risk=risk)

        return {
            "found": credentials_leaked or data_breach or suspicious,
            "email": email,
            "credentials_leaked": credentials_leaked,
            "data_breach": data_breach,
            "reputation": reputation,
            "suspicious": suspicious,
            "references": references,
            "profiles": profiles,
            "last_seen": last_seen,
            "risk_score": risk,
        }

    except httpx.RequestError as exc:
        logger.error("EmailRep request failed", error=str(exc))
        return None

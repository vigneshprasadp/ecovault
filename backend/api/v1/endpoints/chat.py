from fastapi import APIRouter, Depends, HTTPException, Request
from ....core.models import ChatRequest, ChatResponse
from ....services.model_loader import ModelService
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
    Accepts natural-language input, runs NER + sentiment + breach detection,
    returns a structured risk response and an ethical flag if warranted.
    """
    try:
        response, risk = svc.chat_query(req.user_input)
        return ChatResponse(response=response, risk=risk)
    except Exception as exc:
        logger.error("Chat failed", input=req.user_input[:80], error=str(exc))
        raise HTTPException(status_code=500, detail="Chat service error")

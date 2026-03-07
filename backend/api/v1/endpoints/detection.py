from fastapi import APIRouter, Depends, HTTPException, Request
from ....core.models import DetectionRequest, DetectionResponse
from ....services.model_loader import ModelService
from ....api.dependencies import get_model_service, limiter
from ....core.logger import logger

router = APIRouter(prefix="/detection", tags=["Detection"])


@router.post("/", response_model=DetectionResponse, summary="Detect breach echoes for a query")
@limiter.limit("30/minute")
async def detect_echo(
    request: Request,
    req: DetectionRequest,
    svc: ModelService = Depends(get_model_service),
):
    """
    Search the breach corpus for echoes matching `query_text`.
    Returns top-k matches with similarity scores and an anomaly flag.
    """
    try:
        result = svc.detect_echoes(req.query_text, top_k=req.top_k)
        return DetectionResponse(**result)
    except Exception as exc:
        logger.error("Detection failed", query=req.query_text, error=str(exc))
        raise HTTPException(status_code=500, detail="Detection service error")

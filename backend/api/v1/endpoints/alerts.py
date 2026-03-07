from fastapi import APIRouter, Depends, HTTPException, Request
from ....core.models import AlertRequest, AlertResponse
from ....services.model_loader import ModelService
from ....api.dependencies import get_model_service, limiter
from ....core.logger import logger

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.post("/", response_model=AlertResponse, summary="Trigger automated alert for high-risk echo")
@limiter.limit("30/minute")
async def trigger_alert(
    request: Request,
    req: AlertRequest,
    svc: ModelService = Depends(get_model_service),
):
    """
    Evaluates a risk score against a threshold and, if exceeded,
    raises a structured alert with a countermeasure script.
    """
    try:
        result = svc.send_alert(req.risk, req.echo_id, req.threshold)
        return AlertResponse(**result)
    except Exception as exc:
        logger.error("Alert failed", echo_id=req.echo_id, error=str(exc))
        raise HTTPException(status_code=500, detail="Alert service error")

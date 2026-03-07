from fastapi import APIRouter, Depends, HTTPException, Request
from ....core.models import SimulateRequest, SimulateResponse
from ....services.model_loader import ModelService
from ....api.dependencies import get_model_service, limiter
from ....core.logger import logger

router = APIRouter(prefix="/simulation", tags=["Simulation"])


@router.post(
    "/",
    response_model=SimulateResponse,
    summary="Simulate breach echo propagation with causal GNN",
)
@limiter.limit("10/minute")
async def simulate(
    request: Request,
    req: SimulateRequest,
    svc: ModelService = Depends(get_model_service),
):
    """
    Runs the Causal GNN to predict propagation risk from a source breach node,
    returning the predicted spread path, risk score, and a DoWhy causal
    what-if estimate (effect of intervening on propagation delay).
    """
    try:
        result = svc.simulate_propagation(req.source_node)
        return SimulateResponse(**result)
    except Exception as exc:
        logger.error("Simulation failed", source=req.source_node, error=str(exc))
        raise HTTPException(status_code=500, detail="Simulation service error")

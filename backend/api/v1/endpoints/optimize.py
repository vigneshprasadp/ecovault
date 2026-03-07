from fastapi import APIRouter
from ....core.models import OptimizeRequest, OptimizeResponse
from ....services.optimizer_service import optimizer_service
from ....core.logger import logger

router = APIRouter(prefix="/optimize", tags=["Optimize"])

@router.post("/", response_model=OptimizeResponse, summary="Optimize breach response scenario")
async def optimize_scenario(req: OptimizeRequest):
    """
    Evaluates a user-provided breach response scenario using Monte Carlo simulation
    and generates a mathematically optimal response plan using Mixed-Integer Linear Programming.
    """
    try:
        (
            baseline,
            scenario,
            optimal,
            contain_prob,
            time_to_contain,
            ethical_score,
            optimal_plan
        ) = optimizer_service.optimize_response(req.source_node, req.interventions)
        
        return OptimizeResponse(
            baseline_risk=baseline,
            scenario_risk=scenario,
            optimal_risk=optimal,
            containment_probability=contain_prob,
            time_to_containment=time_to_contain,
            ethical_score=ethical_score,
            optimal_plan=optimal_plan
        )
    except Exception as e:
        logger.error("Optimization failed", error=str(e))
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail="Optimizer service error")

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from ....core.models import GraphResponse
from ....services.model_loader import ModelService
from ....api.dependencies import get_model_service, limiter
from ....core.logger import logger
from typing import Optional

router = APIRouter(prefix="/graph", tags=["Graph"])


@router.get("/", response_model=GraphResponse, summary="Get breach propagation graph")
@limiter.limit("30/minute")
async def get_graph(
    request: Request,
    filter: Optional[str] = Query(None, description="Filter nodes by substring (e.g. company name)"),
    svc: ModelService = Depends(get_model_service),
):
    """
    Returns the full echo propagation graph (nodes + edges).
    Optionally filter by node name substring.
    """
    try:
        data = svc.get_graph_data(node_filter=filter)
        return GraphResponse(
            nodes=data["nodes"],
            edges=data["edges"],
            node_count=len(data["nodes"]),
            edge_count=len(data["edges"]),
        )
    except Exception as exc:
        logger.error("Graph fetch failed", filter=filter, error=str(exc))
        raise HTTPException(status_code=500, detail="Graph service error")

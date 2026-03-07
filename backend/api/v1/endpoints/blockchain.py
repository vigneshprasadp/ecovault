from fastapi import APIRouter, Depends, HTTPException, Request
from ....core.models import BlockchainLogRequest, BlockchainLogResponse
from ....services.blockchain import log_echo_on_chain
from ....api.dependencies import limiter
from ....core.logger import logger

router = APIRouter(prefix="/blockchain", tags=["Blockchain"])


@router.post("/log/", response_model=BlockchainLogResponse, summary="Log an echo event on-chain")
@limiter.limit("10/minute")
async def log_blockchain(
    request: Request,
    req: BlockchainLogRequest,
):
    """
    Writes an echo event to the EchoLogger smart contract on Ganache
    (or falls back to in-memory mock if Ganache is not running).
    """
    try:
        result = await log_echo_on_chain(req.echo_id, req.data, req.severity)
        return BlockchainLogResponse(**result)
    except Exception as exc:
        logger.error("Blockchain endpoint error", error=str(exc))
        raise HTTPException(status_code=500, detail="Blockchain service error")

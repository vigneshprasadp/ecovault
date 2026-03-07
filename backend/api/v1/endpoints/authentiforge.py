from fastapi import APIRouter, File, UploadFile, Form, HTTPException
from ....core.models import AuthentiForgeResponse
from ....services.authentiforge_service import authentiforge_service
from ....core.logger import logger

router = APIRouter(prefix="/authentiforge", tags=["AuthentiForge"])

@router.post("/", response_model=AuthentiForgeResponse, summary="Validate Visual Evidence")
async def validate_evidence(
    file: UploadFile = File(...),
    context_text: str = Form("")
):
    """
    Uploads an image for forensic examination via the ethical AI ensemble.
    Returns metrics, a heatmap overlay, and a privacy-redacted preview.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image.")
        
    try:
        contents = await file.read()
        results = authentiforge_service.validate_evidence(image_bytes=contents, context_text=context_text)
        
        return AuthentiForgeResponse(**results)
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error("AuthentiForge processing failed", error=str(e))
        raise HTTPException(status_code=500, detail="Internal server error during analysis")

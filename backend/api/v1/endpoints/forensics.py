import os
import tempfile
import aiofiles
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from ....core.models import ForensicResponse
from ....services.model_loader import ModelService
from ....api.dependencies import get_model_service, limiter
from ....core.logger import logger

router = APIRouter(prefix="/forensics", tags=["Forensics"])

ALLOWED_TYPES = {"image/png", "image/jpeg", "image/webp", "image/gif"}


@router.post(
    "/",
    response_model=ForensicResponse,
    summary="Multimodal forensic trace: image + text → CLIP + GAN adversarial check",
)
@limiter.limit("10/minute")
async def trace_forensic(
    request: Request,
    file: UploadFile = File(..., description="Credential-dump screenshot / echo image"),
    text_query: str = Form("", description="Text context to match against image"),
    svc: ModelService = Depends(get_model_service),
):
    """
    Accepts an uploaded image + optional text query.
    Uses CLIP to compute multimodal similarity (image ↔ text),
    and the trained GAN discriminator to flag adversarial / synthetic images.
    """
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{file.content_type}'. Use PNG/JPEG.",
        )

    tmp_path: str | None = None
    try:
        # Stream upload to a temp file safely
        suffix = os.path.splitext(file.filename or "upload.png")[1] or ".png"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp_path = tmp.name

        async with aiofiles.open(tmp_path, "wb") as out:
            while chunk := await file.read(1024 * 64):
                await out.write(chunk)

        result = svc.forensic_trace(tmp_path, text_query)
        return ForensicResponse(**result)

    except HTTPException:
        raise
    except Exception as exc:
        logger.error("Forensic trace failed", query=text_query[:80], error=str(exc))
        raise HTTPException(status_code=500, detail="Forensics service error")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.unlink(tmp_path)

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from ..services.model_loader import model_service

limiter = Limiter(key_func=get_remote_address)


def get_model_service() -> "model_service.__class__":
    return model_service

"""
EchoVault FastAPI application entry point.
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware
from slowapi.errors import RateLimitExceeded
from fastapi.responses import JSONResponse

from .api.dependencies import limiter
from .api.v1.endpoints import detection, chat, graph, blockchain, alerts, simulation, forensics, optimize, authentiforge
from .core.config import settings
from .core.logger import logger
from .services.model_loader import model_service


# ── Lifespan (replaces on_event in FastAPI 0.95+) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: load models
    logger.info("EchoVault backend starting…", debug=settings.DEBUG)
    model_service.load()
    logger.info("Startup complete ✓")
    yield
    # Shutdown
    logger.info("EchoVault backend shutting down")


# ── App factory ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="EchoVault API",
    description=(
        "AI-driven dark-web breach echo detector.\n\n"
        "Exposes 7 ML features: echo detection, NLP chat, propagation graph, "
        "blockchain logging, risk alerts, causal GNN simulation, and multimodal forensics."
    ),
    version="1.0.0",
    debug=settings.DEBUG,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Rate limiting ─────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_middleware(SlowAPIMiddleware)


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request, exc):
    return JSONResponse(
        status_code=429,
        content={"detail": "Rate limit exceeded. Please slow down."},
    )


# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
PREFIX = settings.API_V1_STR
app.include_router(detection.router,  prefix=PREFIX)
app.include_router(chat.router,       prefix=PREFIX)
app.include_router(graph.router,      prefix=PREFIX)
app.include_router(blockchain.router, prefix=PREFIX)
app.include_router(alerts.router,     prefix=PREFIX)
app.include_router(simulation.router, prefix=PREFIX)
app.include_router(forensics.router,  prefix=PREFIX)
app.include_router(optimize.router,   prefix=PREFIX)
app.include_router(authentiforge.router, prefix=PREFIX)


# ── Health check ─────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"], summary="Service health check")
async def health_check():
    return {
        "status": "healthy",
        "models_loaded": model_service._loaded,
        "version": "1.0.0",
        "endpoints": [
            f"{PREFIX}/detection/",
            f"{PREFIX}/chat/",
            f"{PREFIX}/graph/",
            f"{PREFIX}/blockchain/log/",
            f"{PREFIX}/alerts/",
            f"{PREFIX}/simulation/",
            f"{PREFIX}/forensics/",
            f"{PREFIX}/optimize/",
            f"{PREFIX}/authentiforge/",
        ],
    }

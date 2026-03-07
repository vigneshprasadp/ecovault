from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any


# ── Detection ────────────────────────────────────────────────────────────────
class DetectionRequest(BaseModel):
    query_text: str = Field(..., min_length=1, description="Text to search for breach echoes")
    top_k: int = Field(5, ge=1, le=20)


class DetectionResponse(BaseModel):
    matches: List[Dict[str, Any]]
    similarities: List[float]
    is_anomaly: bool


# ── Chat ─────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    user_input: str = Field(..., min_length=1)


class ChatResponse(BaseModel):
    response: str
    risk: float


# ── Simulation ───────────────────────────────────────────────────────────────
class SimulateRequest(BaseModel):
    source_node: str = Field(..., description="Email or breach node identifier")


class SimulateResponse(BaseModel):
    predicted_path: List[str]
    propagation_risk: float
    causal_what_if: str
    causal_effect: float


# ── Forensics ────────────────────────────────────────────────────────────────
class ForensicResponse(BaseModel):
    trace_to_source: bool
    confidence: float
    robust_against_adversary: bool
    adv_score: float


# ── Blockchain ───────────────────────────────────────────────────────────────
class BlockchainLogRequest(BaseModel):
    echo_id: int = Field(..., ge=0)
    data: str = Field(..., min_length=1)
    severity: float = Field(..., ge=0.0, le=1.0)


class BlockchainLogResponse(BaseModel):
    tx_hash: str
    block_number: Optional[int] = None
    mock: bool = False
    event_data: Dict[str, Any] = {}


# ── Alerts ───────────────────────────────────────────────────────────────────
class AlertRequest(BaseModel):
    risk: float = Field(..., ge=0.0, le=1.0)
    echo_id: str
    threshold: float = Field(0.8, ge=0.0, le=1.0)


class AlertResponse(BaseModel):
    triggered: bool
    message: Optional[str] = None


# ── Graph ────────────────────────────────────────────────────────────────────
class GraphResponse(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]
    node_count: int
    edge_count: int


# ── Optimizer ────────────────────────────────────────────────────────────────
class Intervention(BaseModel):
    id: str
    action: str
    hour: int
    cost: float
    risk_reduction: float

class OptimizeRequest(BaseModel):
    source_node: str
    interventions: List[Intervention] = []

class OptimizeResponse(BaseModel):
    baseline_risk: List[float]
    scenario_risk: List[float]
    optimal_risk: List[float]
    containment_probability: float
    time_to_containment: float
    ethical_score: float
    optimal_plan: List[Dict[str, Any]]

# ── AuthentiForge ────────────────────────────────────────────────────────────
class AuthentiForgeResponse(BaseModel):
    integrity_score: float
    semantic_score: float
    frequency_score: float
    provenance_score: float
    is_tampered: bool
    bias_audit_pass: bool
    heatmap_url: str
    anonymized_url: str
    report_summary: str

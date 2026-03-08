from fastapi import APIRouter
from .database import get_db
from .scheduler import force_pipeline_run, start_dwie_scheduler
from .threat_actor_engine import get_actor_network_data
from .authenticity_engine import get_leak_authenticity
from .attack_simulator import get_attack_simulation
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/dwie", tags=["DWIE"])

class ThreatScore(BaseModel):
    domain: str
    score: int
    category: str
    last_updated: str

class Alert(BaseModel):
    id: int
    post_title: str
    threat_actor_alias: str
    dataset_size: Optional[int]
    timestamp: str

class Prediction(BaseModel):
    domain: str
    predicted_risk: int
    likely_data_type: str
    estimated_records: int

@router.post("/start-monitor")
async def start_monitor():
    """Forces an immediate crawl and analysis cycle."""
    force_pipeline_run()
    return {"status": "success", "message": "DWIE pipeline execution triggered"}

@router.get("/threat-feed", response_model=List[Alert])
async def threat_feed():
    """Returns the latest raw dark web posts logged by the crawler."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, post_title, threat_actor_alias, dataset_size, timestamp FROM raw_darkweb_posts ORDER BY timestamp DESC LIMIT 50")
        return [dict(row) for row in cursor.fetchall()]

@router.get("/threat-score/{domain}", response_model=Optional[ThreatScore])
async def get_threat_score(domain: str):
    """Retrieve correlated threat score for a monitored domain."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT domain, score, category, last_updated FROM threat_scores WHERE domain=?", (domain,))
        row = cursor.fetchone()
        if row:
            return dict(row)
        return None

@router.get("/predictions", response_model=List[Prediction])
async def get_predictions():
    """Returns breach predictions map across monitored domains."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT domain, predicted_risk, likely_data_type, estimated_records FROM predictions ORDER BY predicted_risk DESC LIMIT 20")
        return [dict(row) for row in cursor.fetchall()]

@router.get("/actor-network")
async def get_actor_network():
    """Returns threat actor network graph data."""
    return get_actor_network_data()

@router.get("/leak-authenticity/{post_id}")
async def get_authenticity(post_id: int):
    """Returns authenticity score for a specific dark web post."""
    data = get_leak_authenticity(post_id)
    if data:
        return data
    return {"message": "Not found"}

@router.get("/attack-simulation/{domain}")
async def get_attack_sim(domain: str):
    """Returns monte carlo simulation probabilities of an attack spreading."""
    return get_attack_simulation(domain)

@router.on_event("startup")
async def startup_event():
    # disabled to prevent active use when not required
    # start_dwie_scheduler()
    pass

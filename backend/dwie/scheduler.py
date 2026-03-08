from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from .crawler import simulate_crawl
from .extractor import run_extraction
from .entity_analyzer import analyze_entities
from .risk_engine import calculate_risk
from .prediction_engine import generate_predictions
from .threat_actor_engine import extract_and_track_actor
from .authenticity_engine import calculate_authenticity
from .attack_simulator import simulate_attack_path
from ..core.logger import logger

_scheduler = None

def _run_intel_pipeline():
    logger.info("Running Dark Web Intel Pipeline...")
    try:
        post_id = simulate_crawl()
        run_extraction(post_id)
        matches = analyze_entities(post_id)
        if matches:
            domain = calculate_risk(post_id, matches)
            if domain:
                generate_predictions(domain, post_id)
                extract_and_track_actor(post_id, matches)
                calculate_authenticity(post_id)
                simulate_attack_path(domain)
                logger.info("Intel pipeline completed successfully", target=domain)
    except Exception as e:
        logger.error("Error in DWIE Pipeline", error=str(e))

def start_dwie_scheduler():
    global _scheduler
    if _scheduler is None:
        _scheduler = AsyncIOScheduler()
        _scheduler.add_job(
            _run_intel_pipeline,
            trigger=IntervalTrigger(minutes=2),
            id='dwie_intel_pipeline',
            replace_existing=True
        )
        _scheduler.start()
        logger.info("DWIE Scheduler Started.")

def force_pipeline_run():
    _run_intel_pipeline()

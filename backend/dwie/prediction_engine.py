import random
from datetime import datetime
from .database import get_db

def generate_predictions(domain: str, post_id: int):
    """Apply heuristics to estimate breach characteristics."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT dataset_size, data_preview FROM raw_darkweb_posts WHERE id = ?", (post_id,))
        post = cursor.fetchone()
        
        # Pseudo ML heuristcs
        risk_percentage = random.randint(70, 95)
        
        data_type = "Dataset Dump"
        if "password" in post['data_preview']:
            data_type = "Credential Dump"
        elif "vpn" in post['data_preview']:
            data_type = "Infrastructure Breach"
            
        est_records = post['dataset_size'] or random.randint(5000, 100000)
        
        cursor.execute('''
            INSERT INTO predictions (domain, predicted_risk, likely_data_type, estimated_records, last_updated)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(domain) DO UPDATE SET predicted_risk=excluded.predicted_risk, likely_data_type=excluded.likely_data_type, estimated_records=excluded.estimated_records, last_updated=excluded.last_updated
        ''', (domain, risk_percentage, data_type, est_records, datetime.utcnow().isoformat()))
        conn.commit()

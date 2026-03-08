from datetime import datetime
from .database import get_db

def calculate_risk(post_id: int, matched_entities: list):
    """Calculate threat score based on intel parameters."""
    if not matched_entities: return
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM raw_darkweb_posts WHERE id = ?", (post_id,))
        post = cursor.fetchone()
        
        score = 0
        
        # Signals
        if post['data_preview']: score += 30
        if post['threat_actor_alias'] in ["LockBit", "Lapsus$"]: score += 25
        if post['dataset_size'] and post['dataset_size'] > 10000: score += 20
        if post['source_name'] in ["HydraForum", "BreachForums"]: score += 15
        
        score += 10 # Recency default for demo
        
        score = min(score, 100)
        
        cat = "Low"
        if score > 40: cat = "Medium"
        if score > 70: cat = "Critical"
        
        # Associate score to domain (simplify matching logic by grabbing just the domain)
        # Assuming domain is derived directly from the match (e.g. examplecorp.com)
        domain = matched_entities[0] # Take primary match
        if "@" in domain: domain = domain.split("@")[1]
            
        cursor.execute('''
            INSERT INTO threat_scores (domain, score, category, last_updated)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(domain) DO UPDATE SET score=excluded.score, category=excluded.category, last_updated=excluded.last_updated
        ''', (domain, score, cat, datetime.utcnow().isoformat()))
        conn.commit()
    return domain

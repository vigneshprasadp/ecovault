import random
from datetime import datetime
from .database import get_db

SOURCES = ["HydraForum", "ShadowMarketX", "BreachForums", "RansomLeakHub"]
ACTORS = ["DarkOverlord", "ShadowMarketX", "Lapsus$", "Anonymous", "LockBit"]

SYNTHETIC_POSTS = [
    {
        "source_name": "HydraForum",
        "post_title": "Selling corporate database dump",
        "post_content": "domain: examplecorp.com records: 42000 includes emails and hashed passwords BTC only",
        "threat_actor_alias": "ShadowMarketX",
        "data_preview": "admin@examplecorp.com:$2b$12... user@examplecorp.com:$2b$12...",
        "dataset_size": 42000
    },
    {
        "source_name": "RansomLeakHub",
        "post_title": "Payment deadline missed - full infra leak",
        "post_content": "We are releasing infrastructure details and VPN configs for techcorp.net.",
        "threat_actor_alias": "LockBit",
        "data_preview": "vpn1.techcorp.net 10.0.0.1 admin password123",
        "dataset_size": 1500
    },
    {
        "source_name": "BreachForums",
        "post_title": "Fresh logs for testdomain.com",
        "post_content": "Over 500k lines of access logs for testdomain.com.",
        "threat_actor_alias": "DarkOverlord",
        "data_preview": "GET /api/v1/auth 200 OK 192.168.1.5",
        "dataset_size": 500000
    }
]

def simulate_crawl():
    """Simulate intelligence gathering from the dark web."""
    # Pick a random post to ingest
    post = random.choice(SYNTHETIC_POSTS)
    timestamp = datetime.utcnow().isoformat()
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO raw_darkweb_posts (source_name, post_title, post_content, timestamp, threat_actor_alias, data_preview, dataset_size)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (post['source_name'], post['post_title'], post['post_content'], timestamp, post['threat_actor_alias'], post['data_preview'], post['dataset_size']))
        post_id = cursor.lastrowid
        conn.commit()
        
    return post_id

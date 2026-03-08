import re
from .database import get_db

DOMAIN_REGEX = re.compile(r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}')
EMAIL_REGEX = re.compile(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+')

def run_extraction(post_id: int):
    """Simulate NLP extraction (using Regex for performance/reliability)."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT post_content, data_preview FROM raw_darkweb_posts WHERE id = ?", (post_id,))
        row = cursor.fetchone()
        
        if not row: return
        
        content = f"{row['post_content']} {row['data_preview']}"
        extracted = []
        
        # Extract Domains
        domains = DOMAIN_REGEX.findall(content)
        for d in set(domains):
            extracted.append(("domain", d))
            
        # Extract Emails
        emails = EMAIL_REGEX.findall(content)
        for e in set(emails):
            extracted.append(("email", e))
            
        # Save extracted entities
        for e_type, e_val in extracted:
            cursor.execute("INSERT INTO extracted_entities (post_id, entity_type, entity_value) VALUES (?, ?, ?)", 
                           (post_id, e_type, e_val))
        conn.commit()

from .database import get_db

MONITORED_ASSETS = ["examplecorp.com", "techcorp.net", "testdomain.com"]

def analyze_entities(post_id: int):
    """Find if extracted entities match tracked organizational domains."""
    matches = []
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id, entity_type, entity_value FROM extracted_entities WHERE post_id = ?", (post_id,))
        for row in cursor.fetchall():
            val = row['entity_value']
            
            # Check for matches
            if any(asset in val for asset in MONITORED_ASSETS):
                matches.append(val)
                
    return list(set(matches))

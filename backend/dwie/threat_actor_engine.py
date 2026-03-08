from .database import get_db

def track_threat_actor(actor_name: str, source_market: str, target_domain: str, data_type: str, post_id: int, timestamp: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO threat_actor_graph (actor_name, source_market, target_domain, data_type, post_id, timestamp)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (actor_name, source_market, target_domain, data_type, post_id, timestamp))
        conn.commit()

def extract_and_track_actor(post_id: int, matched_entities: list):
    if not matched_entities: return
    
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT threat_actor_alias, source_name, timestamp FROM raw_darkweb_posts WHERE id = ?", (post_id,))
        post = cursor.fetchone()
        
        domain = matched_entities[0]
        if "@" in domain: domain = domain.split("@")[1]
            
        cursor.execute("SELECT likely_data_type FROM predictions WHERE domain = ?", (domain,))
        pred = cursor.fetchone()
        data_type = pred['likely_data_type'] if pred else "Unknown"

        track_threat_actor(post['threat_actor_alias'], post['source_name'], domain, data_type, post_id, post['timestamp'])

def get_actor_network_data():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM threat_actor_graph")
        rows = cursor.fetchall()
        
    nodes_map = {}
    links = []

    def get_or_create_node(node_id, group):
        if node_id not in nodes_map:
            nodes_map[node_id] = {"id": node_id, "group": group, "name": node_id, "val": 10 if group == "actor" else (5 if group == "company" else 7)}
        return nodes_map[node_id]

    for row in rows:
        actor = row['actor_name']
        market = row['source_market']
        company = row['target_domain']
        
        get_or_create_node(actor, "actor")
        get_or_create_node(market, "market")
        get_or_create_node(company, "company")
        
        # Link actor to market
        links.append({"source": actor, "target": market, "label": "sells on"})
        # Link actor to company
        links.append({"source": actor, "target": company, "label": "targeted", "data_type": row['data_type']})

    return {"nodes": list(nodes_map.values()), "links": links}

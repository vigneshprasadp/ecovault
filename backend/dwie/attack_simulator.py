import networkx as nx
import numpy as np
from datetime import datetime
from .database import get_db

def simulate_attack_path(domain: str):
    G = nx.DiGraph()
    # Build typical infrastructure graph
    edges = [
        ("Employee_Laptop", "VPN_Gateway"),
        ("VPN_Gateway", "Internal_App_Server"),
        ("Internal_App_Server", "Main_Database"),
        ("Employee_Laptop", "File_Server"),
        ("File_Server", "Domain_Controller"),
        ("Main_Database", "Domain_Controller")
    ]
    G.add_edges_from(edges)
    
    probs = {node: 0.05 for node in G.nodes}
    # Initial compromise
    probs["Employee_Laptop"] = 0.95
    probs["VPN_Gateway"] = 0.85
    
    # Run simple monte carlo / propagation heuristic
    for _ in range(3):
        for u, v in G.edges:
            probs[v] = min(1.0, probs[v] + probs[u] * np.random.uniform(0.2, 0.6))
            
    timestamp = datetime.utcnow().isoformat()
    with get_db() as conn:
        cursor = conn.cursor()
        for node, prob in probs.items():
            cursor.execute('''
                INSERT INTO attack_simulation_results (domain, node_name, compromise_probability, simulation_timestamp)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(domain, node_name) DO UPDATE SET compromise_probability=excluded.compromise_probability, simulation_timestamp=excluded.simulation_timestamp
            ''', (domain, node, round(float(prob), 2), timestamp))
        conn.commit()

def get_attack_simulation(domain: str):
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT node_name, compromise_probability, simulation_timestamp FROM attack_simulation_results WHERE domain = ?", (domain,))
        return [dict(row) for row in cursor.fetchall()]

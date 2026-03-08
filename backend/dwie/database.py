import sqlite3
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), "dwie_intel.db")

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS raw_darkweb_posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                source_name TEXT,
                post_title TEXT,
                post_content TEXT,
                timestamp TEXT,
                threat_actor_alias TEXT,
                data_preview TEXT,
                dataset_size INTEGER
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS extracted_entities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER,
                entity_type TEXT,
                entity_value TEXT,
                FOREIGN KEY(post_id) REFERENCES raw_darkweb_posts(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS threat_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT UNIQUE,
                score INTEGER,
                category TEXT,
                last_updated TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS predictions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT UNIQUE,
                predicted_risk INTEGER,
                likely_data_type TEXT,
                estimated_records INTEGER,
                last_updated TEXT
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS threat_actor_graph (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                actor_name TEXT,
                source_market TEXT,
                target_domain TEXT,
                data_type TEXT,
                post_id INTEGER,
                timestamp TEXT,
                FOREIGN KEY(post_id) REFERENCES raw_darkweb_posts(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS leak_authenticity_scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER UNIQUE,
                authenticity_score INTEGER,
                classification TEXT,
                confidence TEXT,
                FOREIGN KEY(post_id) REFERENCES raw_darkweb_posts(id)
            )
        ''')
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attack_simulation_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                domain TEXT,
                node_name TEXT,
                compromise_probability REAL,
                simulation_timestamp TEXT,
                UNIQUE(domain, node_name)
            )
        ''')
        conn.commit()

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

# Initialize DB on import
init_db()

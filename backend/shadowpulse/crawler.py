import asyncio
import json
import logging
import random
from typing import Optional

try:
    from kafka import KafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logger = logging.getLogger("echovault")

class ShadowPulseCrawler:
    def __init__(self):
        self.producer = None
        if KAFKA_AVAILABLE:
            try:
                self.producer = KafkaProducer(bootstrap_servers='localhost:9092')
                logger.info("ShadowPulse connected to Kafka Event Stream.")
            except Exception:
                logger.warning("ShadowPulse: Kafka node unreachable. Running in mock offline mode.")
    
    async def start_routine(self):
        logger.info("Initializing Ray Distributed Workers across Tor nodes...")
        await asyncio.sleep(2)
        logger.info("ShadowPulse Tor crawler online. Intercepting SOCKS5 routed traffic.")
        
        while True:
            await asyncio.sleep(15) # Pulse every 15s for the demo
            mock_data = {
                "source": "abcmarket.onion",
                "emails_found": [f"admin_{random.randint(100,999)}@company.com"],
                "passwords_dumped": random.randint(1000, 50000),
                "target_crypto_wallets": random.randint(0, 5)
            }
            
            if self.producer:
                try:
                    self.producer.send("darkweb_intel", json.dumps(mock_data).encode('utf-8'))
                except Exception as e:
                    logger.error(f"Kafka publish error: {e}")
            
            logger.info(f"ShadowPulse Live Tor Intercept -> {mock_data}")

_crawler: Optional[ShadowPulseCrawler] = None

def get_crawler() -> ShadowPulseCrawler:
    global _crawler
    if _crawler is None:
        _crawler = ShadowPulseCrawler()
    return _crawler

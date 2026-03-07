"""
Blockchain service — connects to Ganache if available, otherwise falls back
to in-memory mock logging so the backend boots and stays usable without
a running Ganache instance.
"""

from __future__ import annotations
import hashlib
import time
from datetime import datetime
from ..core.config import settings
from ..core.logger import logger

# ── Try real Web3 connection ─────────────────────────────────────────────────
_web3_available = False
_w3 = None
_contract = None
_account = None

ECHO_LOGGER_ABI = [
    {
        "anonymous": False,
        "inputs": [
            {"indexed": True,  "internalType": "uint256", "name": "echoId",    "type": "uint256"},
            {"indexed": False, "internalType": "string",  "name": "data",      "type": "string"},
            {"indexed": False, "internalType": "uint256", "name": "severity",  "type": "uint256"},
            {"indexed": False, "internalType": "address", "name": "logger",    "type": "address"},
            {"indexed": False, "internalType": "uint256", "name": "timestamp", "type": "uint256"},
        ],
        "name": "EchoLogged",
        "type": "event",
    },
    {
        "inputs": [
            {"internalType": "uint256", "name": "echoId",   "type": "uint256"},
            {"internalType": "string",  "name": "data",     "type": "string"},
            {"internalType": "uint256", "name": "severity", "type": "uint256"},
        ],
        "name": "logEcho",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]

try:
    from web3 import Web3

    _w3 = Web3(Web3.HTTPProvider(settings.GANACHE_RPC_URL, request_kwargs={"timeout": 5}))
    if _w3.is_connected():
        # Try injecting PoA middleware (needed for Ganache / Clique chains)
        try:
            from web3.middleware import ExtraDataToPOAMiddleware  # web3 7.x
            _w3.middleware_onion.inject(ExtraDataToPOAMiddleware, layer=0)
        except ImportError:
            try:
                from web3.middleware import geth_poa_middleware  # web3 5/6.x
                _w3.middleware_onion.inject(geth_poa_middleware, layer=0)
            except ImportError:
                pass

        pk = settings.GANACHE_PRIVATE_KEY
        if pk and pk != "0x0000000000000000000000000000000000000000000000000000000000000001":
            _account = _w3.eth.account.from_key(pk)
            _w3.eth.default_account = _account.address
            addr = settings.ECHO_LOGGER_CONTRACT_ADDRESS
            if addr and addr != "0x0000000000000000000000000000000000000000":
                _contract = _w3.eth.contract(
                    address=Web3.to_checksum_address(addr),
                    abi=ECHO_LOGGER_ABI,
                )
                _web3_available = True
                logger.info("Blockchain: connected to Ganache", url=settings.GANACHE_RPC_URL)
            else:
                logger.warning("Blockchain: contract address not set — mock mode")
        else:
            logger.warning("Blockchain: private key not set — mock mode")
    else:
        logger.warning("Blockchain: Ganache not reachable — mock mode")
except Exception as _exc:
    logger.warning("Blockchain: web3 init error — mock mode", error=str(_exc))


# ── In-memory mock ───────────────────────────────────────────────────────────
_mock_logs: list[dict] = []


def _mock_log(echo_id: int, data: str, severity: float) -> dict:
    ts = datetime.utcnow().isoformat()
    raw = f"{echo_id}{data}{severity}{ts}"
    fake_hash = "0x" + hashlib.sha256(raw.encode()).hexdigest()
    entry = {
        "tx_hash": fake_hash,
        "block_number": len(_mock_logs) + 1,
        "mock": True,
        "event_data": {
            "echoId": echo_id,
            "data": data,
            "severity": int(severity * 1000),
            "timestamp": int(time.time()),
        },
    }
    _mock_logs.append(entry)
    logger.info("Mock blockchain log", echo_id=echo_id, hash=fake_hash)
    return entry


# ── Public API ───────────────────────────────────────────────────────────────
async def log_echo_on_chain(echo_id: int, data: str, severity: float) -> dict:
    """Write an echo event to the chain (or mock if Ganache is unavailable)."""
    if not _web3_available:
        return _mock_log(echo_id, data, severity)

    try:
        severity_int = int(severity * 1000)
        tx = _contract.functions.logEcho(echo_id, data, severity_int).build_transaction(
            {
                "from": _account.address,
                "nonce": _w3.eth.get_transaction_count(_account.address),
                "gas": 200_000,
                "gasPrice": _w3.eth.gas_price,
            }
        )
        signed = _account.sign_transaction(tx)
        tx_hash = _w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = _w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)
        logs = _contract.events.EchoLogged().process_receipt(receipt)
        event_data = dict(logs[0]["args"]) if logs else {}
        # serialise bytes objects
        event_data = {k: (v.hex() if isinstance(v, bytes) else v) for k, v in event_data.items()}
        logger.info("Echo logged on-chain", tx=tx_hash.hex(), echo_id=echo_id)
        return {
            "tx_hash": tx_hash.hex(),
            "block_number": receipt.blockNumber,
            "mock": False,
            "event_data": event_data,
        }
    except Exception as exc:
        logger.error("On-chain log failed — falling back to mock", error=str(exc))
        return _mock_log(echo_id, data, severity)

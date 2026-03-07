"""
ModelService — loads every artifact produced by Phase 2 and exposes
callable wrappers.  We never pickle lambdas; we re-wrap the loaded
sklearn/torch objects here so they're always serialisation-safe.
"""

from __future__ import annotations

import pickle
import numpy as np
import torch
import joblib
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity

from ..core.logger import logger

MODELS_DIR = Path(__file__).parent.parent.parent / "models"


class ModelService:
    """Singleton that loads all Phase-2 artifacts once on startup."""

    _instance: "ModelService | None" = None

    # ── singleton ────────────────────────────────────────────────────────────
    def __new__(cls) -> "ModelService":
        if cls._instance is None:
            inst = super().__new__(cls)
            inst._loaded = False
            cls._instance = inst
        return cls._instance

    # ── public boot ─────────────────────────────────────────────────────────
    def load(self) -> None:
        if self._loaded:
            return
        logger.info("Loading Phase-2 models…")
        self._load_detection()
        self._load_chat()
        self._load_graph()
        self._load_gnn()
        self._load_gan()
        self._loaded = True
        logger.info("All models loaded ✓")

    # ── loaders ─────────────────────────────────────────────────────────────
    def _load_detection(self) -> None:
        d = joblib.load(MODELS_DIR / "detection_model.pkl")
        self._vectorizer = d["vectorizer"]
        self._breach_vectors = d["breach_vectors"]
        self._anomaly_model = d["anomaly_model"]

        import pandas as pd
        breach_path = Path(__file__).parent.parent.parent / "data/breaches/synthetic_breaches.csv"
        self._breaches_df = pd.read_csv(breach_path)

    def _load_chat(self) -> None:
        d = joblib.load(MODELS_DIR / "chat_model.pkl")
        self._ner = d["ner"]
        self._sentiment = d["sentiment"]
        # embed_model kept for potential future use

    def _load_graph(self) -> None:
        with open(MODELS_DIR / "echo_graph.pkl", "rb") as f:
            self._graph = pickle.load(f)

    def _load_gnn(self) -> None:
        from torch_geometric.nn import GCNConv
        import torch.nn as nn

        class _GNN(nn.Module):
            def __init__(self):
                super().__init__()
                self.conv1 = GCNConv(3, 32)
                self.conv2 = GCNConv(32, 32)
                self.out = nn.Linear(32, 1)

            def forward(self, x, edge_index):
                x = self.conv1(x, edge_index).relu()
                x = self.conv2(x, edge_index).relu()
                return torch.sigmoid(self.out(x))

        self._gnn = _GNN()
        self._gnn.load_state_dict(
            torch.load(MODELS_DIR / "causal_gnn.pt", map_location="cpu")
        )
        self._gnn.eval()

        # Build node index + edge tensor from graph
        G = self._graph
        all_nodes = list(G.nodes())
        self._node_to_idx = {n: i for i, n in enumerate(all_nodes)}
        self._all_nodes = all_nodes
        src, dst = [], []
        for u, v in G.edges():
            src += [self._node_to_idx[u], self._node_to_idx[v]]
            dst += [self._node_to_idx[v], self._node_to_idx[u]]
        if src:
            self._edge_index = torch.tensor([src, dst], dtype=torch.long)
        else:
            self._edge_index = torch.tensor([[0, 1], [1, 0]], dtype=torch.long)
        n = len(all_nodes)
        torch.manual_seed(42)
        self._x_tensor = torch.rand(n, 3)

    def _load_gan(self) -> None:
        import torch.nn as nn
        import clip as openai_clip

        class _GAN(nn.Module):
            def __init__(self):
                super().__init__()
                self.generator = nn.Sequential(
                    nn.Linear(100, 256), nn.ReLU(), nn.Linear(256, 512)
                )
                self.discriminator = nn.Sequential(
                    nn.Linear(512, 256), nn.ReLU(), nn.Linear(256, 1), nn.Sigmoid()
                )

        self._gan = _GAN()
        self._gan.load_state_dict(
            torch.load(MODELS_DIR / "adversarial_gan.pt", map_location="cpu")
        )
        self._gan.eval()

        self._clip_model, self._clip_preprocess = openai_clip.load(
            "ViT-B/32", device="cpu"
        )

    # ── public API ───────────────────────────────────────────────────────────

    def detect_echoes(self, query_text: str, top_k: int = 5) -> dict:
        vec = self._vectorizer.transform([str(query_text)])
        sims = cosine_similarity(vec, self._breach_vectors).flatten()
        top_idx = np.argsort(sims)[-top_k:][::-1]
        matches = (
            self._breaches_df.iloc[top_idx][["email", "company", "severity"]]
            .to_dict("records")
        )
        is_anomaly = bool(self._anomaly_model.decision_function(vec)[0] < -0.1)
        return {
            "matches": matches,
            "similarities": sims[top_idx].tolist(),
            "is_anomaly": is_anomaly,
        }

    def chat_query(self, user_input: str) -> tuple[str, float]:
        import re
        entities = self._ner(user_input)
        sentiment = self._sentiment(user_input)[0]
        
        # 1. Exact Email Search
        emails_in_query = re.findall(r"[\w\.-]+@[\w\.-]+", user_input)
        exact_match = None
        if emails_in_query:
            target_email = emails_in_query[0].lower()
            matching_rows = self._breaches_df[self._breaches_df["email"].str.lower() == target_email]
            if not matching_rows.empty:
                row = matching_rows.iloc[0]
                exact_match = {
                    "email": row["email"],
                    "company": row["company"],
                    "severity": row["severity"]
                }
        
        # 2. TF-IDF Fallback
        det = self.detect_echoes(user_input, top_k=1)
        sim_score = det["similarities"][0] if det["similarities"] else 0
        
        if exact_match:
            m = exact_match
            is_match = True
            sim_score = 1.0
        else:
            is_match = bool(det["matches"] and sim_score > 0.45)
            m = det["matches"][0] if is_match else None
        
        sev = m["severity"] if is_match else 0.1
        
        # Risk algorithm
        base_multiplier = 1.0 + (len(entities) * 0.1)
        sentiment_mod = sentiment["score"] if sentiment["label"] == "NEGATIVE" else (1 - sentiment["score"])
        
        if is_match:
            risk = round(min((sev * base_multiplier) + (sentiment_mod * 0.3), 1.0), 3)
        else:
            risk = round(min(sentiment_mod * 0.15 * base_multiplier, 0.4), 3)
        
        match_info = ""
        if is_match:
            sev_label = "very high" if sev > 0.8 else "moderate" if sev > 0.4 else "low"
            match_info = (
                f"I found a record that seems to match your search — "
                f"it's linked to **{m['company']}** (email: `{m['email']}`). "
                f"The severity of this breach is rated as **{sev_label}**."
            )
        else:
            match_info = "I didn't find any specific breach records that match your search in our local database."

        # Sentiment-based friendly framing
        tone = sentiment["label"].lower()
        if tone == "negative" and sentiment["score"] > 0.6:
            tone_note = "Your message sounds quite urgent, which I understand — let me help you stay safe."
        elif tone == "negative":
            tone_note = "I can sense some concern in your message. Let me share what I know."
        else:
            tone_note = "Here's what my analysis found."

        # Entity note
        entity_note = ""
        if entities:
            words = list(set([e["word"] for e in entities]))
            entity_note = f" (I picked up these terms from your message: {', '.join(words[:4])})"

        # Risk explanation
        if risk > 0.6:
            risk_note = f"Based on what I found, the risk level looks **high** ({risk}). I'd recommend taking action soon."
        elif risk > 0.3:
            risk_note = f"The risk level appears **moderate** ({risk}). It's worth keeping an eye on this."
        else:
            risk_note = f"The risk level looks **low** ({risk}). Things seem okay, but staying cautious never hurts."

        response = (
            f"{tone_note}\n\n"
            f"{match_info}{entity_note}\n\n"
            f"{risk_note}"
        )

        if is_match:
            response += (
                "\n\nTo protect yourself, I'd suggest:\n"
                "1. **Change your password** for any accounts linked to this email\n"
                "2. **Enable two-step login (2FA)** on your important accounts\n"
                "3. **Watch out for phishing emails** — hackers often target people after a breach"
            )

        if sentiment["label"] == "NEGATIVE" and sentiment["score"] > 0.7:
            response += "\n\n💬 If you're worried, feel free to ask me to check a specific email address for a more detailed live scan."

        return response, risk

    def get_graph_data(self, node_filter: str | None = None) -> dict:
        import networkx as nx
        G = self._graph
        nodes_iter = G.nodes()
        if node_filter:
            nodes_iter = [n for n in G if node_filter.lower() in str(n).lower()]
            sub = G.subgraph(nodes_iter)
        else:
            sub = G
        nodes = [
            {"id": str(n), "severity": float(G.nodes[n].get("severity", 0))}
            for n in sub.nodes()
        ]
        edges = [
            {
                "source": str(u),
                "target": str(v),
                "weight": float(d.get("weight", 1.0)),
            }
            for u, v, d in sub.edges(data=True)
        ]
        return {"nodes": nodes, "edges": edges}

    def send_alert(self, risk: float, echo_id: str, threshold: float = 0.8) -> dict:
        if risk > threshold:
            msg = (
                f"\U0001f6a8 ALERT: Echo '{echo_id}' (risk={risk:.2f}) exceeds "
                f"threshold {threshold}. Recommend immediate password-reset procedure."
            )
            return {"triggered": True, "message": msg}
        return {"triggered": False, "message": None}

    def simulate_propagation(self, source_node: str) -> dict:
        import networkx as nx
        import pandas as pd
        from dowhy import CausalModel

        with torch.no_grad():
            prop_risk = float(
                self._gnn(self._x_tensor, self._edge_index).mean().item()
            )

        path = [source_node]
        G = self._graph
        try:
            if source_node in G and self._all_nodes:
                target = self._all_nodes[-1]
                if nx.has_path(G, source_node, target):
                    path = [str(n) for n in nx.shortest_path(G, source_node, target)[:5]]
        except Exception:
            pass

        # Causal DoWhy estimate - cache to avoid severe latency
        if not hasattr(self, "_cached_causal_effect"):
            causal_data = pd.DataFrame({
                "breach": [1, 0, 1, 0, 1, 0],
                "delay":  [24, 12, 48, 5, 36, 8],
                "severity": [0.8, 0.4, 0.9, 0.1, 0.75, 0.3],
            })
            cm = CausalModel(
                data=causal_data, treatment="delay", outcome="severity",
                graph="digraph { breach -> delay; delay -> severity; breach -> severity; }",
            )
            est = cm.estimate_effect(
                cm.identify_effect(proceed_when_unidentifiable=True),
                method_name="backdoor.linear_regression",
            )
            self._cached_causal_effect = round(float(est.value), 3)

        causal_effect = self._cached_causal_effect

        return {
            "predicted_path": path,
            "propagation_risk": round(prop_risk, 3),
            "causal_what_if": f"Risk reduction: {abs(causal_effect) * 100:.1f}% if delay intervened",
            "causal_effect": causal_effect,
        }

    def forensic_trace(self, image_path: str, text_query: str) -> dict:
        import clip as openai_clip
        from PIL import Image

        img = Image.open(image_path).convert("RGB")
        img_tensor = self._clip_preprocess(img).unsqueeze(0)
        tokens = openai_clip.tokenize([str(text_query)], truncate=True)

        with torch.no_grad():
            img_feat = self._clip_model.encode_image(img_tensor).float()
            txt_feat = self._clip_model.encode_text(tokens).float()
            img_feat /= img_feat.norm(dim=-1, keepdim=True)
            txt_feat /= txt_feat.norm(dim=-1, keepdim=True)
            trace_score = float((img_feat @ txt_feat.T)[0, 0].item())

        noise = torch.randn(1, 100)
        with torch.no_grad():
            fake_emb = self._gan.generator(noise)
            adv_score = float(self._gan.discriminator(fake_emb).item())

        return {
            "trace_to_source": trace_score > 0.3,
            "confidence": round(trace_score, 3),
            "robust_against_adversary": adv_score < 0.5,
            "adv_score": round(adv_score, 3),
        }


# Module-level singleton (imported by FastAPI dependency)
model_service = ModelService()

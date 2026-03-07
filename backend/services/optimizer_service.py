import numpy as np
import pulp
from typing import List, Dict, Any, Tuple
from ..core.models import Intervention

class OptimizerService:
    def __init__(self):
        self._max_hours = 24
        
        # Predefined ethical weights & constraints
        # Each action has a risk reduction impact, a financial/resource cost, and an ethical concern score (0-1)
        self.action_db = {
            "isolate_node":      {"cost": 3.0, "risk_reduction": 0.5, "ethical": 0.4},
            "enforce_mfa":       {"cost": 1.0, "risk_reduction": 0.3, "ethical": 0.9},
            "deploy_honeypot":   {"cost": 4.0, "risk_reduction": 0.6, "ethical": 0.8},
            "alert_team":        {"cost": 0.5, "risk_reduction": 0.2, "ethical": 1.0},
            "block_ip_ranges":   {"cost": 2.0, "risk_reduction": 0.4, "ethical": 0.7},
            "quarantine_subnet": {"cost": 5.0, "risk_reduction": 0.8, "ethical": 0.3},
        }

    def _simulate_baseline(self) -> List[float]:
        """Simple logistic growth curve for unmitigated risk propagation."""
        # Risk grows from a starting level and saturates at 1.0 over 24 hours
        # using a simple sigmoid
        hours = np.arange(self._max_hours)
        midpoint = 8 # Critical mass reached at hour 8
        rate = 0.5
        risk = 1 / (1 + np.exp(-rate * (hours - midpoint)))
        # Normalize slightly so it starts low
        risk = risk - risk[0] + 0.05
        return np.clip(risk, 0.0, 1.0).tolist()

    def _apply_interventions(self, baseline: List[float], interventions: List[Intervention]) -> List[float]:
        """Apply a user's chosen interventions onto the baseline risk."""
        risk = np.array(baseline)
        
        # Sort interventions by hour
        sorted_ix = sorted(interventions, key=lambda x: x.hour)
        
        # Apply cumulative reductions starting from the hour the action occurs
        for action in sorted_ix:
            hour = action.hour
            if hour >= len(risk):
                continue
            
            # Simple decay model: intervention drops risk immediately but effectiveness decays
            decay = np.exp(-0.1 * np.arange(len(risk) - hour))
            impact = action.risk_reduction * decay
            
            risk[hour:] = risk[hour:] - impact
            
        return np.clip(risk, 0.0, 1.0).tolist()

    def optimize_response(self, source_node: str, user_interventions: List[Intervention]) -> Tuple[List[float], List[float], List[float], float, float, float, List[Dict[str, Any]]]:
        """
        Runs PuLP MILP to find the mathematically optimal intervention strategy
        and evaluates the user's provided strategy using Monte Carlo.
        """
        baseline = self._simulate_baseline()
        scenario_risk = self._apply_interventions(baseline, user_interventions)
        
        # ── 1. PuLP MILP Optimization ─────────────────────────────────────────
        # Objective: minimize sum(risk_t) + lambda * sum(cost_a * picked_a)
        # Constraint: total budget <= 10.0
        prob = pulp.LpProblem("BreachResponseOptimizer", pulp.LpMinimize)
        
        # Decision variables: x[action][hour] -> binary (1 if triggered, 0 otherwise)
        actions = list(self.action_db.keys())
        hours = range(0, self._max_hours, 2) # restrict choices to every 2 hours to simplify
        x = pulp.LpVariable.dicts("action_time", (actions, hours), cat='Binary')
        
        # Aux variables for risk at hour t
        r = pulp.LpVariable.dicts("risk", range(self._max_hours), lowBound=0.0, upBound=1.0)
        
        # Build risk constraints (Linear approximation of reduction)
        for t in range(self._max_hours):
            reduction = 0
            for a in actions:
                for h in hours:
                    if h <= t:
                        reduction += x[a][h] * self.action_db[a]["risk_reduction"]
            
            # Risk at time t is approx baseline minus reduction
            prob += r[t] >= baseline[t] - reduction
        
        # Budget constraint
        total_cost = 0
        for a in actions:
            for h in hours:
                total_cost += x[a][h] * self.action_db[a]["cost"]
        prob += total_cost <= 8.0 # Example budget constraint
        
        # Objective
        prob += pulp.lpSum([r[t] for t in range(self._max_hours)]) + 0.2 * total_cost
        
        # Solve
        prob.solve(pulp.PULP_CBC_CMD(msg=False, timeLimit=2))
        
        optimal_risk = []
        optimal_plan = []
        
        for t in range(self._max_hours):
            optimal_risk.append(pulp.value(r[t]) if pulp.value(r[t]) is not None else baseline[t])
            
        for a in actions:
            for h in hours:
                if pulp.value(x[a][h]) == 1.0:
                    optimal_plan.append({
                        "action": a,
                        "hour": h,
                        "cost": self.action_db[a]["cost"],
                        "risk_reduction": self.action_db[a]["risk_reduction"]
                    })
        
        # If solver failed, just return baseline as optimal
        if not optimal_plan:
            optimal_risk = baseline
            
        optimal_plan = sorted(optimal_plan, key=lambda i: i["hour"])
        
        # ── 2. Ethical Score ──────────────────────────────────────────────────
        # Computes how ethical the user's interventions are (user disruption vs safety)
        if len(user_interventions) == 0:
            ethical_score = 0.5
        else:
            scores = [self.action_db.get(ix.action, {}).get("ethical", 0.5) for ix in user_interventions]
            ethical_score = sum(scores) / len(scores)

        # ── 3. Monte Carlo Simulation Ensemble ────────────────────────────────
        # Run 100 iterations with slightly jittered effectiveness and base risks
        # to find probabilistic time to containment (< 0.2 risk) and probability
        attempts = 100
        containment_count = 0
        times_to_contain = []
        
        for _ in range(attempts):
            # Jitter effectiveness
            jittered_interventions = []
            for action in user_interventions:
                jitter = np.random.normal(1.0, 0.2) # 20% variance in effectiveness
                jittered_interventions.append(
                    Intervention(
                        id=action.id,
                        action=action.action,
                        hour=action.hour,
                        cost=action.cost,
                        risk_reduction=action.risk_reduction * jitter
                    )
                )
                
            sim_risk = self._apply_interventions(baseline, jittered_interventions)
            
            # Did it contain? (Risk drops below 0.2 after interventions start)
            if user_interventions:
                start_hour = min(ix.hour for ix in user_interventions)
                contained = False
                for h in range(start_hour, self._max_hours):
                    if sim_risk[h] < 0.2:
                        containment_count += 1
                        times_to_contain.append(h)
                        contained = True
                        break

        contain_prob = containment_count / attempts if attempts > 0 else 0.0
        avg_time = float(np.mean(times_to_contain)) if times_to_contain else float(self._max_hours)

        return (
            baseline,
            scenario_risk,
            optimal_risk,
            contain_prob,
            avg_time,
            ethical_score,
            optimal_plan
        )

optimizer_service = OptimizerService()

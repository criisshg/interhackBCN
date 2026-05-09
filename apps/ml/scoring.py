"""Scoring · prioridad combinada.

prioridad_score = f(impacto_estimado, urgencia_dias, prob_conversion_heuristica, valor_potencial)

Heurísticas iniciales (P1 ajusta tras EDA):
- impacto_estimado = potencial_anual_subfamilia × prob_conversion × frac_anual_pendiente
- urgencia: menor dias = mayor score (decay exponencial)
- prob_conversion según tipologia: loyal=0.6, promiscuous=0.35, at_risk=0.25, marginal=0.15
"""
from __future__ import annotations

PROB_CONVERSION_BY_TIPOLOGIA = {
    "loyal": 0.60,
    "promiscuous": 0.35,
    "at_risk": 0.25,
    "marginal": 0.15,
}


def priority_score(impacto: float, urgencia_dias: int, tipologia: str) -> float:
    prob = PROB_CONVERSION_BY_TIPOLOGIA.get(tipologia, 0.2)
    urgency_factor = max(0.1, 1.0 - urgencia_dias / 30)
    return impacto * prob * urgency_factor


def recommended_channel(tipologia: str, impacto: float) -> str:
    if impacto > 5000 and tipologia in {"loyal", "promiscuous", "at_risk"}:
        return "rep"
    if tipologia == "marginal":
        return "marketing"
    return "telesales"

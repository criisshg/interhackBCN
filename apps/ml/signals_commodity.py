"""Motor de señales · COMMODITY.

Por cada (cliente × subfamilia con tipologia ∈ {loyal, promiscuous, marginal}):
- intervalo medio entre compras + std
- alerta CAPTURA si tipologia ∈ {promiscuous, marginal} y dias_desde_ultima >= media + k·std
- alerta REPOSICION si tipologia=loyal y dias_para_proxima ≤ X

Filtra unidades<=0 para análisis de cadencia. k se calibra por percentiles globales.
"""
from __future__ import annotations

import pandas as pd


def detect_commodity_signals(
    transactions: pd.DataFrame,
    tipologia: pd.DataFrame,
    today: pd.Timestamp | None = None,
    k_std: float = 1.5,
) -> pd.DataFrame:
    """Devuelve DataFrame con columnas alineadas al schema de `alerts`."""
    raise NotImplementedError("P1: implementar señales commodity")

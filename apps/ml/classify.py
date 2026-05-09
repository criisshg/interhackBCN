"""Clasificación · capa analítica.

Asigna a cada (cliente × subfamilia) una tipología:
- loyal       → SoW > 0.7 y cadencia regular
- promiscuous → 0.2 < SoW < 0.7 (gap relevante con potencial)
- at_risk     → era loyal y muestra deterioro sostenido
- marginal    → resto (sin actividad, sin potencial, residual)

Y a cada cliente un `clinic_segment` (perfil global) con reglas simples.
"""
from __future__ import annotations

import pandas as pd

LOYAL_SOW_MIN = 0.7
PROMISCUOUS_SOW_MIN = 0.2


def classify_client_subfam(transactions: pd.DataFrame, potential: pd.DataFrame) -> pd.DataFrame:
    """Devuelve DataFrame con columnas: client_id, subfamilia, tipologia, sow."""
    raise NotImplementedError("P1: implementar lógica de tipología")


def segment_clients(transactions: pd.DataFrame) -> pd.DataFrame:
    """Devuelve DataFrame con: client_id, clinic_segment.

    MVP: 3-4 segmentos por reglas (volumen anual, regularidad, mix).
    Extra (E0bis): KMeans sobre features comportamentales.
    """
    raise NotImplementedError("P1: implementar segmentación")

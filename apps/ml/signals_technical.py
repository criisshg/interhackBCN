"""Motor de señales · TECHNICAL.

Por cada (cliente × subfamilia técnica con histórico ≥ N períodos):
- baseline rolling 6-12 meses (frecuencia y volumen)
- alerta DETERIORO_SOSTENIDO si M períodos consecutivos < banda inferior (media - k·std)

Distinguir pausa normal (varianza alta) de deterioro (caída sostenida con tendencia).
NO disparar con un único valor bajo.
"""
from __future__ import annotations

import pandas as pd


def detect_technical_signals(
    transactions: pd.DataFrame,
    min_periods: int = 6,
    consecutive_below: int = 3,
    k_std: float = 1.0,
) -> pd.DataFrame:
    """Devuelve DataFrame con columnas alineadas al schema de `alerts`."""
    raise NotImplementedError("P1: implementar señales technical")

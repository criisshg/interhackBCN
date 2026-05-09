"""Datos para slides · F4.

Extrae 2-3 cifras llamativas de la BD para que Ger las incluya en las diapositivas.
Ejecutar una vez con la BD de producción cargada (después de run_signals.py).

Usage:
    python slides_data.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine


def main() -> None:
    from dotenv import load_dotenv
    load_dotenv()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        db_path = Path(__file__).resolve().parent.parent.parent / "pulse_dev.db"
        db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url)

    alerts = pd.read_sql("SELECT * FROM alerts", engine)
    client_status = pd.read_sql("SELECT * FROM client_status", engine)
    transactions = pd.read_sql(
        "SELECT client_id, value, is_return, is_zero FROM transactions", engine
    )
    for col in ["is_return", "is_zero"]:
        if col in transactions.columns:
            transactions[col] = transactions[col].astype(bool)

    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])]

    # ------------------------------------------------------------------
    # DATO 1 · € pipeline total detectado
    # ------------------------------------------------------------------
    pipeline_total = alerts["impacto_estimado"].sum()
    n_alertas = len(alerts)

    # ------------------------------------------------------------------
    # DATO 2 · % clientes promiscuos en el top decil de facturación
    # ------------------------------------------------------------------
    revenue_per_client = ventas.groupby("client_id")["value"].sum().reset_index(name="total_value")
    p90 = revenue_per_client["total_value"].quantile(0.90)
    top_decil = revenue_per_client[revenue_per_client["total_value"] > p90]["client_id"]

    promisc_top = client_status[
        (client_status["client_id"].isin(top_decil))
        & (client_status["tipologia"] == "promiscuous")
    ]
    pct_promisc_top = len(promisc_top) / len(top_decil) * 100 if len(top_decil) > 0 else 0

    # ------------------------------------------------------------------
    # DATO 3 · Clientes en fuga detectados
    # ------------------------------------------------------------------
    at_risk_ids = client_status[client_status["tipologia"] == "at_risk"]["client_id"].nunique()
    total_active = client_status[client_status["tipologia"] != "marginal"]["client_id"].nunique()
    pct_at_risk = at_risk_ids / total_active * 100 if total_active > 0 else 0

    # ------------------------------------------------------------------
    # EXTRAS para contexto
    # ------------------------------------------------------------------
    by_tipo = alerts["tipo_dinamica"].value_counts().to_dict() if "tipo_dinamica" in alerts.columns else {}
    avg_impacto = alerts["impacto_estimado"].mean() if not alerts.empty else 0
    top_provincia = None
    try:
        clients_db = pd.read_sql("SELECT client_id, province FROM clients", engine)
        merged = alerts.merge(clients_db, on="client_id", how="left")
        top_provincia = merged["province"].value_counts().idxmax() if not merged.empty else None
    except Exception:
        pass

    # ------------------------------------------------------------------
    # Output
    # ------------------------------------------------------------------
    SEP = "=" * 60

    print(f"\n{SEP}")
    print("  DATOS PARA SLIDES · PULSE — entregado a Ger (P5)")
    print(f"{SEP}\n")

    print(f"  DATO 1 — € PIPELINE DETECTADO")
    print(f"  {pipeline_total:,.0f} € de oportunidad comercial identificada")
    print(f"  ({n_alertas} alertas activas, impacto medio {avg_impacto:,.0f} €/alerta)\n")

    print(f"  DATO 2 — CLIENTES PROMISCUOS EN TOP DECIL")
    print(f"  {pct_promisc_top:.0f}% de los clientes top-10% por facturación")
    print(f"  compran también a competencia (gap de share-of-wallet capturables)\n")

    print(f"  DATO 3 — CLIENTES EN FUGA DETECTADOS")
    print(f"  {at_risk_ids} clínicas con deterioro sostenido ({pct_at_risk:.1f}% de clientes activos)\n")

    print(f"  CONTEXTO ADICIONAL")
    print(f"  Alertas commodity / technical: {by_tipo}")
    if top_provincia:
        print(f"  Provincia con más alertas: {top_provincia}")

    print(f"\n{SEP}")
    print("  ⚠ Recordar en slides: actividad de competencia es INFERIDA")
    print("    (gap entre potencial declarado y ventas Inibsa observadas)")
    print(f"{SEP}\n")


if __name__ == "__main__":
    main()

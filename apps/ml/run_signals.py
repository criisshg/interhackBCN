"""Orquestador del recálculo diario.

Lee de Postgres, ejecuta classify + signals_commodity + signals_technical + scoring,
y vuelca en `alerts` (truncate + insert).
"""
from __future__ import annotations

import json
import os
import datetime
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine, text

from classify import classify_client_subfam, segment_clients
from scoring import priority_score, recommended_channel
from signals_commodity import detect_commodity_signals
from signals_technical import detect_technical_signals


def _parse_features(raw) -> dict:
    if isinstance(raw, str):
        return json.loads(raw)
    return raw or {}


def _urgencia_dias(tipo: str, features: dict) -> int:
    if tipo == "CAPTURA":
        return max(1, int(features.get("days_since_last", 30) - features.get("mean_days", 30)))
    if tipo == "REPOSICION":
        return max(1, int(features.get("mean_days", 30) - features.get("days_since_last", 0)))
    return 30  # DETERIORO_SOSTENIDO


def _impacto_estimado(tipo: str, features: dict, avg_monthly: float) -> float:
    if tipo == "CAPTURA":
        return avg_monthly * (features.get("days_since_last", 30) / 30)
    if tipo == "REPOSICION":
        return avg_monthly
    # DETERIORO_SOSTENIDO
    baseline = features.get("baseline_6m", 0.0)
    recent = features.get("recent_3m_avg", 0.0)
    return max(0.0, (baseline - recent) * 3)


def _plazo_dias(tipologia: str, urgencia: int) -> int:
    if tipologia == "at_risk":
        return 7
    if tipologia in ("loyal", "promiscuous") and urgencia < 15:
        return 14
    if tipologia == "marginal":
        return 30
    return 14


def _gestor(canal: str) -> str:
    return {"rep": "Delegado Comercial", "telesales": "Telesales", "marketing": "Marketing"}.get(canal, "Telesales")


def main() -> dict[str, int]:
    from dotenv import load_dotenv
    load_dotenv()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        db_path = Path(__file__).resolve().parent.parent.parent / "pulse_dev.db"
        db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url)

    print("1. Cargando datos de DB...")
    transactions = pd.read_sql("SELECT * FROM transactions", engine)
    for col in ["is_return", "is_zero", "is_outlier"]:
        if col in transactions.columns:
            transactions[col] = transactions[col].astype(bool)

    potential = pd.read_sql("SELECT * FROM client_potential", engine)
    products = pd.read_sql("SELECT * FROM products", engine)

    print("2. Clasificando clientes...")
    tipologia = classify_client_subfam(transactions, potential, products)

    print("2.5. Segmentando clínicas (E0bis KMeans)...")
    segments = segment_clients(transactions)
    segments.to_sql("_seg_tmp", engine, if_exists="replace", index=False)
    with engine.begin() as conn:
        try:
            conn.execute(text(
                "UPDATE clients SET clinic_segment = s.clinic_segment "
                "FROM _seg_tmp s WHERE clients.client_id = s.client_id"
            ))
        except Exception:
            # SQLite no soporta UPDATE FROM — sintaxis alternativa
            conn.execute(text(
                "UPDATE clients SET clinic_segment = ("
                "  SELECT clinic_segment FROM _seg_tmp"
                "  WHERE _seg_tmp.client_id = clients.client_id"
                ")"
            ))
        conn.execute(text("DROP TABLE IF EXISTS _seg_tmp"))

    print("3. Generando señales Commodity...")
    # z_percentile_min=60: solo top-40% más tardíos → evita inundación
    alerts_comm = detect_commodity_signals(
        transactions, tipologia, products, z_percentile_min=60.0
    )

    print("4. Generando señales Technical...")
    # drop_pct_min=0.20: solo alertas con caída real ≥ 20% vs baseline
    alerts_tech = detect_technical_signals(
        transactions, tipologia, products, drop_pct_min=0.20
    )

    print("5. Consolidando alertas...")
    alerts_list = [df for df in (alerts_comm, alerts_tech) if not df.empty]
    if not alerts_list:
        print("No se generaron alertas.")
        return {"alerts_generated": 0}

    alerts = pd.concat(alerts_list, ignore_index=True)

    # Avg monthly value per client×subfamily — proxy para impacto_estimado
    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])].copy()
    ventas["date"] = pd.to_datetime(ventas["date"])
    ventas = ventas.merge(products[["product_id", "subfamily"]], on="product_id", how="left")
    ventas["month"] = ventas["date"].dt.to_period("M")
    monthly_val = ventas.groupby(["client_id", "subfamily", "month"])["value"].sum().reset_index()
    avg_monthly = (
        monthly_val.groupby(["client_id", "subfamily"])["value"]
        .mean()
        .reset_index(name="avg_monthly_value")
    )
    alerts = alerts.merge(avg_monthly, on=["client_id", "subfamily"], how="left")
    alerts["avg_monthly_value"] = alerts["avg_monthly_value"].fillna(100.0)

    # Construir filas alineadas al schema de `alerts`
    now = datetime.datetime.now()
    rows = []
    for _, row in alerts.iterrows():
        tipo = row["tipo"]
        tipologia_cliente = row["tipologia_cliente"]
        features = _parse_features(row["features_json"])
        features["tipo_alerta"] = tipo  # trazabilidad del subtipo

        urgencia = _urgencia_dias(tipo, features)
        impacto = _impacto_estimado(tipo, features, float(row["avg_monthly_value"]))
        canal = recommended_channel(tipologia_cliente, impacto)
        score = priority_score(impacto, urgencia, tipologia_cliente)

        rows.append({
            "fecha": now,
            "client_id": row["client_id"],
            "subfamilia": row["subfamily"],
            "tipo_dinamica": "commodity" if tipo in ("CAPTURA", "REPOSICION") else "technical",
            "tipologia_cliente": tipologia_cliente,
            "motivo": row["motivo"],
            "urgencia_dias": urgencia,
            "prioridad_score": score,
            "impacto_estimado": impacto,
            "canal_recomendado": canal,
            "gestor_responsable": _gestor(canal),
            "plazo_dias": _plazo_dias(tipologia_cliente, urgencia),
            "estado": "nueva",
            "features_json": json.dumps(features),
        })

    final_alerts = pd.DataFrame(rows)

    print(f"6. Guardando {len(final_alerts)} alertas en base de datos...")
    try:
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE client_status CASCADE"))
            conn.execute(text("TRUNCATE TABLE alerts CASCADE"))
    except Exception:
        pass

    tipologia.to_sql("client_status", engine, if_exists="append", index=False)
    final_alerts.to_sql("alerts", engine, if_exists="append", index=False)

    return {"alerts_generated": len(final_alerts)}


if __name__ == "__main__":
    summary = main()
    print("RESUMEN:", summary)

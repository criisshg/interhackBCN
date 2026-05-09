"""Orquestador del recálculo diario.

Lee de Postgres, ejecuta classify + signals_commodity + signals_technical + scoring,
y vuelca en `alerts` (truncate + insert).
"""
from __future__ import annotations

import os
from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine, text
import datetime

from classify import classify_client_subfam
from signals_commodity import detect_commodity_signals
from signals_technical import detect_technical_signals


def main() -> dict[str, int]:
    from dotenv import load_dotenv
    load_dotenv()
    
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        db_path = Path(__file__).resolve().parent.parent.parent / "pulse_dev.db"
        db_url = f"sqlite:///{db_path}"
        
    engine = create_engine(db_url)

    print("1. Cargando datos de DB...")
    with engine.connect() as conn:
        transactions = pd.read_sql_query(text("SELECT * FROM transactions"), conn)
        potential = pd.read_sql_query(text("SELECT * FROM client_potential"), conn)
        products = pd.read_sql_query(text("SELECT * FROM products"), conn)
    
    # SQLite boolean compatibility fix
    for col in ['is_return', 'is_zero', 'is_outlier']:
        if col in transactions.columns:
            transactions[col] = transactions[col].astype(bool)
            
    print("2. Clasificando clientes...")
    tipologia = classify_client_subfam(transactions, potential, products)
    
    print("2.5 Guardando estado global de clientes para gráficas del Frontend...")
    tipologia.to_sql("client_status", engine, if_exists="replace", index=False)
    
    print("3. Generando señales Commodity...")
    alerts_comm = detect_commodity_signals(transactions, tipologia, products)
    
    print("4. Generando señales Technical...")
    alerts_tech = detect_technical_signals(transactions, tipologia, products)
    
    print("5. Consolidando alertas...")
    # Concatenar DataFrames si no están vacíos
    alerts_list = []
    if not alerts_comm.empty:
        alerts_list.append(alerts_comm)
    if not alerts_tech.empty:
        alerts_list.append(alerts_tech)
        
    if not alerts_list:
        print("No se generaron alertas.")
        return {"alerts_generated": 0}
        
    alerts = pd.concat(alerts_list, ignore_index=True)
    
    # Añadir columnas metadata
    alerts['date_created'] = datetime.datetime.now()
    
    # Prioridad: Si no viene calculada del motor (ej: technical), asignar defaults
    if 'prioridad_score' not in alerts.columns:
        alerts['prioridad_score'] = 1.0
        
    alerts.loc[(alerts['tipo'] == 'DETERIORO_SOSTENIDO') & (alerts['prioridad_score'].isna() | (alerts['prioridad_score'] == 0)), 'prioridad_score'] = 99.0
    
    alerts_for_api = _to_api_alert_schema(alerts)

    print(f"6. Guardando {len(alerts_for_api)} alertas en base de datos...")
    try:
        with engine.begin() as conn:
            conn.execute(text("TRUNCATE TABLE client_status CASCADE"))
            conn.execute(text("TRUNCATE TABLE alerts CASCADE"))
    except Exception:
        pass
        
    tipologia.to_sql("client_status", engine, if_exists="append", index=False)
    alerts_for_api.to_sql("alerts", engine, if_exists="append", index=False)

    return {"alerts_generated": len(alerts_for_api)}


def _to_api_alert_schema(alerts: pd.DataFrame) -> pd.DataFrame:
    """Adapta las señales analíticas al contrato de la API."""
    out = pd.DataFrame()
    out['id'] = range(1, len(alerts) + 1)
    out['fecha'] = alerts['date_created']
    out['client_id'] = alerts['client_id'].astype(int)
    out['subfamilia'] = alerts['subfamily']
    out['tipo_dinamica'] = alerts['tipo'].map({
        'CAPTURA': 'commodity',
        'REPOSICION': 'commodity',
        'DETERIORO_SOSTENIDO': 'technical',
    }).fillna('commodity')
    out['tipologia_cliente'] = alerts['tipologia_cliente']
    out['motivo'] = alerts['motivo']
    out['urgencia_dias'] = alerts['tipo'].map({
        'DETERIORO_SOSTENIDO': 2,
        'REPOSICION': 5,
        'CAPTURA': 7,
    }).fillna(10).astype(int)
    out['prioridad_score'] = alerts['prioridad_score'].fillna(1.0).astype(float)
    out['impacto_estimado'] = (out['prioridad_score'] * 100).round(2)
    out['canal_recomendado'] = out.apply(
        lambda row: 'rep'
        if row['impacto_estimado'] > 5000 and row['tipologia_cliente'] != 'marginal'
        else 'marketing'
        if row['tipologia_cliente'] == 'marginal'
        else 'telesales',
        axis=1,
    )
    out['gestor_responsable'] = out['canal_recomendado'].map({
        'rep': 'delegado',
        'telesales': 'inside sales',
        'marketing': 'marketing automation',
    })
    out['plazo_dias'] = out['urgencia_dias']
    out['estado'] = 'nueva'
    out['features_json'] = alerts['features_json']
    return out


if __name__ == "__main__":
    summary = main()
    print("RESUMEN:", summary)

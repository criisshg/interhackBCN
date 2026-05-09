"""Orquestador del recálculo diario.

Lee de Postgres, ejecuta classify + signals_commodity + signals_technical + scoring,
y vuelca en `alerts` (truncate + insert).
"""
from __future__ import annotations

import os
from pathlib import Path
import pandas as pd
from sqlalchemy import create_engine
import uuid
import datetime

from classify import classify_client_subfam, segment_clients
from signals_commodity import detect_commodity_signals
from signals_technical import detect_technical_signals


def main() -> dict[str, int]:
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        db_path = Path(__file__).resolve().parent.parent.parent / "pulse_dev.db"
        db_url = f"sqlite:///{db_path}"
        
    engine = create_engine(db_url)

    print("1. Cargando datos de DB...")
    transactions = pd.read_sql("SELECT * FROM transactions", engine)
    
    # SQLite boolean compatibility fix
    for col in ['is_return', 'is_zero', 'is_outlier']:
        if col in transactions.columns:
            transactions[col] = transactions[col].astype(bool)
            
    potential = pd.read_sql("SELECT * FROM client_potential", engine)
    products = pd.read_sql("SELECT * FROM products", engine)

    print("2. Clasificando clientes...")
    tipologia = classify_client_subfam(transactions, potential, products)
    
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
    alerts['alert_id'] = [str(uuid.uuid4()) for _ in range(len(alerts))]
    alerts['estado'] = 'pending'
    alerts['date_created'] = datetime.datetime.now()
    
    # Prioridad básica para el MVP: DETERIORO > CAPTURA > REPOSICION
    alerts['prioridad_score'] = 1.0
    alerts.loc[alerts['tipo'] == 'REPOSICION', 'prioridad_score'] = 5.0
    alerts.loc[alerts['tipo'] == 'CAPTURA', 'prioridad_score'] = 8.0
    alerts.loc[alerts['tipo'] == 'DETERIORO_SOSTENIDO', 'prioridad_score'] = 10.0
    
    print(f"6. Guardando {len(alerts)} alertas en base de datos...")
    alerts.to_sql("alerts", engine, if_exists="replace", index=False)

    return {"alerts_generated": len(alerts)}


if __name__ == "__main__":
    summary = main()
    print("RESUMEN:", summary)

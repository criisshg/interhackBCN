"""Motor de señales · COMMODITY.

Por cada (cliente × subfamilia con tipologia ∈ {loyal, promiscuous, marginal}):
- intervalo medio entre compras + std
- alerta CAPTURA si tipologia ∈ {promiscuous, marginal} y dias_desde_ultima >= media + k·std
- alerta REPOSICION si tipologia=loyal y dias_para_proxima ≤ X
"""
from __future__ import annotations

import pandas as pd
import numpy as np

def detect_commodity_signals(
    transactions: pd.DataFrame,
    tipologia: pd.DataFrame,
    products: pd.DataFrame,
    today: pd.Timestamp | None = None,
    k_std: float = 1.5,
) -> pd.DataFrame:
    """Devuelve DataFrame con columnas alineadas al schema de `alerts`."""
    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])].copy()
    ventas['date'] = pd.to_datetime(ventas['date'])
    
    if today is None:
        today = ventas['date'].max()
    
    # Filtrar solo commodities (C1, C2)
    prod_c = products[products['analytical_block'] == 'Commodities']
    ventas_c = ventas[ventas['product_id'].isin(prod_c['product_id'])].copy()
    ventas_c = ventas_c.merge(prod_c[['product_id', 'subfamily']], on='product_id', how='left')
    
    # Eliminar duplicados en el mismo día para calcular frecuencias
    v_freq = ventas_c.drop_duplicates(subset=['client_id', 'subfamily', 'date']).sort_values(['client_id', 'subfamily', 'date'])
    v_freq['prev_date'] = v_freq.groupby(['client_id', 'subfamily'])['date'].shift(1)
    v_freq['days_between'] = (v_freq['date'] - v_freq['prev_date']).dt.days
    
    # Estadísticas por cliente
    stats = v_freq.groupby(['client_id', 'subfamily']).agg(
        last_purchase=('date', 'max'),
        mean_days=('days_between', 'mean'),
        std_days=('days_between', 'std'),
        count_purchases=('date', 'count')
    ).reset_index()
    
    # Solo clientes con al menos 2 compras tienen 'mean_days'
    stats = stats[stats['count_purchases'] >= 2].copy()
    stats['std_days'] = stats['std_days'].fillna(stats['mean_days'] * 0.2) # Si std es NaN (solo 2 compras), asume 20%
    
    stats['days_since_last'] = (today - stats['last_purchase']).dt.days
    stats['threshold_captura'] = stats['mean_days'] + (k_std * stats['std_days'])
    
    # Merge con tipología
    stats = stats.merge(tipologia[['client_id', 'subfamily', 'tipologia']], on=['client_id', 'subfamily'], how='inner')
    
    alerts = []
    
    for _, row in stats.iterrows():
        tipo = None
        motivo = ""
        
        # Regla CAPTURA
        if row['tipologia'] in ['promiscuous', 'marginal'] and row['days_since_last'] > row['threshold_captura']:
            tipo = 'CAPTURA'
            motivo = f"Ha roto su ciclo habitual. Han pasado {row['days_since_last']} días (su media era {row['mean_days']:.1f} días)."
            
        # Regla REPOSICION
        elif row['tipologia'] == 'loyal' and row['days_since_last'] >= max(0, row['mean_days'] - 7):
            # Si le faltan 7 días o menos para su ciclo habitual
            tipo = 'REPOSICION'
            motivo = f"A punto de quedarse sin stock. Compra cada {row['mean_days']:.1f} días y ya han pasado {row['days_since_last']}."
            
        if tipo:
            import json
            features = {
                "mean_days": float(row['mean_days']),
                "std_days": float(row['std_days']),
                "days_since_last": int(row['days_since_last']),
                "threshold_captura": float(row['threshold_captura'])
            }
            alerts.append({
                'client_id': row['client_id'],
                'subfamily': row['subfamily'],
                'tipo': tipo,
                'tipologia_cliente': row['tipologia'],
                'motivo': motivo,
                'features_json': json.dumps(features)
            })
            
    return pd.DataFrame(alerts)

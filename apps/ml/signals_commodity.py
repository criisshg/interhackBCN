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
    k_std: float = 1.0,
) -> pd.DataFrame:
    """Devuelve DataFrame con columnas alineadas al schema de `alerts`."""
    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])].copy()
    ventas['date'] = pd.to_datetime(ventas['date'])
    
    if today is None:
        today = ventas['date'].max()
    
    # Calcular facturación total por cliente (para Reposición)
    revenue = ventas.groupby('client_id')['value'].sum().reset_index()
    # Calcular percentil de facturación global
    revenue['revenue_percentile'] = revenue['value'].rank(pct=True) * 100
    
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
    stats['std_days'] = stats['std_days'].fillna(stats['mean_days'] * 0.2)
    
    stats['days_since_last'] = (today - stats['last_purchase']).dt.days
    
    # Z-Score para la severidad del retraso
    stats['z_score'] = (stats['days_since_last'] - stats['mean_days']) / stats['std_days']
    
    # Merge con tipología y SoW
    stats = stats.merge(tipologia[['client_id', 'subfamily', 'tipologia', 'sow']], on=['client_id', 'subfamily'], how='inner')
    stats = stats.merge(revenue[['client_id', 'revenue_percentile']], on='client_id', how='left')
    
    # Calcular el percentil global del Z-Score solo para los que van tarde (z_score > 0)
    capturas_candidatas = stats[(stats['tipologia'].isin(['promiscuous', 'marginal'])) & (stats['z_score'] > 0)].copy()
    if not capturas_candidatas.empty:
        capturas_candidatas['z_percentile'] = capturas_candidatas['z_score'].rank(pct=True) * 100
    else:
        capturas_candidatas['z_percentile'] = []
        
    # Unir z_percentile a stats
    stats = stats.merge(capturas_candidatas[['client_id', 'subfamily', 'z_percentile']], on=['client_id', 'subfamily'], how='left')
    stats['z_percentile'] = stats['z_percentile'].fillna(0)
    
    alerts = []
    
    for _, row in stats.iterrows():
        tipo = None
        motivo = ""
        prioridad_dinamica = 0.0
        
        # Regla CAPTURA
        # Mantenemos un umbral básico (z_score > 1.0) para considerarlo anomalía
        if row['tipologia'] in ['promiscuous', 'marginal'] and row['z_score'] > k_std:
            tipo = 'CAPTURA'
            motivo = f"Retraso de {row['days_since_last']} días (Media: {row['mean_days']:.0f} días). Su retraso es mayor al {row['z_percentile']:.0f}% de los clientes de esta familia."
            prioridad_dinamica = row['z_percentile']
            
        # Regla REPOSICION
        # Para leales, el score viene dado por su facturación
        elif row['tipologia'] == 'loyal' and row['days_since_last'] >= max(0, row['mean_days'] - 7):
            tipo = 'REPOSICION'
            motivo = f"Reponer stock. Ciclo: {row['mean_days']:.0f} días, lleva {row['days_since_last']}. Cliente Top {100-row['revenue_percentile']:.0f}% de España."
            prioridad_dinamica = row['revenue_percentile']
            
        if tipo:
            import json
            features = {
                "mean_days": float(row['mean_days']),
                "std_days": float(row['std_days']),
                "days_since_last": int(row['days_since_last']),
                "z_score_deviation": float(row['z_score']),
                "z_percentile_global": float(row['z_percentile']),
                "sow_subfamily": float(row['sow']),
                "revenue_percentile_global": float(row['revenue_percentile'])
            }
            alerts.append({
                'client_id': row['client_id'],
                'subfamily': row['subfamily'],
                'tipo': tipo,
                'tipologia_cliente': row['tipologia'],
                'motivo': motivo,
                'prioridad_score': float(prioridad_dinamica),
                'features_json': json.dumps(features)
            })
            
    return pd.DataFrame(alerts)

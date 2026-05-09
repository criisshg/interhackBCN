"""Motor de señales · TECHNICAL.

Por cada (cliente × subfamilia técnica con histórico ≥ N períodos):
- baseline rolling 6-12 meses (frecuencia y volumen)
- alerta DETERIORO_SOSTENIDO si M períodos consecutivos < banda inferior (media - k·std)
"""
from __future__ import annotations

import pandas as pd
import numpy as np

def detect_technical_signals(
    transactions: pd.DataFrame,
    tipologia: pd.DataFrame,
    products: pd.DataFrame,
    today: pd.Timestamp | None = None,
    min_periods: int = 6,
    consecutive_below: int = 3,
    k_std: float = 1.0,
) -> pd.DataFrame:
    """Devuelve DataFrame con columnas alineadas al schema de `alerts`."""
    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])].copy()
    ventas['date'] = pd.to_datetime(ventas['date'])
    
    if today is None:
        today = ventas['date'].max()
    
    # Filtrar solo technical (T1, T2)
    prod_t = products[products['analytical_block'] == 'Technical']
    ventas_t = ventas[ventas['product_id'].isin(prod_t['product_id'])].copy()
    ventas_t = ventas_t.merge(prod_t[['product_id', 'subfamily']], on='product_id', how='left')
    
    # Agrupación mensual
    ventas_t['month'] = ventas_t['date'].dt.to_period('M')
    v_monthly = ventas_t.groupby(['client_id', 'subfamily', 'month'])['value'].sum().reset_index()
    
    current_month = pd.to_datetime(today).to_period('M')
    
    alerts = []
    
    # Procesar cliente a cliente agrupado
    groups = v_monthly.groupby(['client_id', 'subfamily'])
    
    for (cid, subf), group in groups:
        if len(group) < min_periods:
            continue
            
        group = group.sort_values('month').set_index('month')
        
        # Asegurar todos los meses entre su primera compra y HOY (rellenar con 0 si no compró)
        all_months = pd.period_range(start=group.index.min(), end=current_month, freq='M')
        group = group.reindex(all_months, fill_value=0).reset_index()
        group = group.rename(columns={'index': 'month'})
        
        # Calcular rolling baseline (últimos 6 meses, shift 1 para no incluir el actual)
        baseline = group['value'].rolling(window=6, min_periods=3).mean().shift(1)
        std_dev = group['value'].rolling(window=6, min_periods=3).std().shift(1).fillna(0)
        lower_band = baseline - (k_std * std_dev)
        lower_band = lower_band.clip(lower=0) # banda inferior nunca es negativa
        
        # Check últimos 'consecutive_below' meses
        last_m_months = group.tail(consecutive_below)
        last_m_lower = lower_band.tail(consecutive_below)
        last_m_baseline = baseline.tail(consecutive_below)
        
        if len(last_m_months) == consecutive_below:
            is_below = (last_m_months['value'] <= last_m_lower).all()
            
            if is_below and last_m_baseline.mean() > 100: # Solo si el baseline era significativo
                # Obtener la tipologia
                tip_df = tipologia[(tipologia['client_id'] == cid) & (tipologia['subfamily'] == subf)]
                tip = tip_df['tipologia'].iloc[0] if not tip_df.empty else 'marginal'
                
                # Exigimos que fuera un cliente decente para preocuparnos del deterioro
                if tip in ['loyal', 'promiscuous', 'at_risk']:
                    import json
                    
                    mean_val = float(last_m_baseline.iloc[-1]) if not np.isnan(last_m_baseline.iloc[-1]) else 0.0
                    curr_val = float(last_m_months['value'].mean())
                    
                    features = {
                        "baseline_6m": mean_val,
                        "recent_3m_avg": curr_val,
                        "drop_pct": float(1 - (curr_val/mean_val)) if mean_val > 0 else 0
                    }
                    
                    motivo = f"Deterioro sostenido: Lleva {consecutive_below} meses comprando muy por debajo de su media (Media={mean_val:.0f}€, Actual={curr_val:.0f}€)."
                    
                    alerts.append({
                        'client_id': cid,
                        'subfamily': subf,
                        'tipo': 'DETERIORO_SOSTENIDO',
                        'tipologia_cliente': tip,
                        'motivo': motivo,
                        'features_json': json.dumps(features)
                    })
                    
    return pd.DataFrame(alerts)

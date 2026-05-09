"""Motor de señales · TECHNICAL.

Por cada (cliente × subfamilia técnica con histórico ≥ N períodos):
- baseline rolling 6-12 meses (frecuencia y volumen)
- alerta DETERIORO_SOSTENIDO si M períodos consecutivos < banda inferior (media - k·std)
- Priorización basada en el percentil global del impacto económico de la caída.
"""
from __future__ import annotations

import pandas as pd
import numpy as np
import json

def detect_technical_signals(
    transactions: pd.DataFrame,
    tipologia: pd.DataFrame,
    products: pd.DataFrame,
    today: pd.Timestamp | None = None,
    min_periods: int = 6,
    consecutive_below: int = 3,
    k_std: float = 1.0,
    drop_pct_min: float = 0.0,
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
    
    current_month = pd.to_datetime(today).to_period('M')
    
    # Pre-merge de tipologia para acceso rápido
    tip_dict = tipologia.set_index(['client_id', 'subfamily'])[['tipologia', 'sow']].to_dict('index')
    
    alerts_raw = []
    
    # Agrupar la suma mensual cruda
    v_monthly_simple = ventas_t.groupby(['client_id', 'subfamily', 'month'])['value'].sum().reset_index()
    groups = v_monthly_simple.groupby(['client_id', 'subfamily'])
    
    for (cid, subf), group in groups:
        if len(group) < min_periods:
            continue
            
        group = group.sort_values('month').set_index('month')
        
        # Asegurar todos los meses entre su primera compra y HOY
        all_months = pd.period_range(start=group.index.min(), end=current_month, freq='M')
        group = group.reindex(all_months, fill_value=0).reset_index()
        group = group.rename(columns={'index': 'month'})
        
        # Calcular rolling baseline
        baseline = group['value'].rolling(window=6, min_periods=3).mean().shift(1)
        std_dev = group['value'].rolling(window=6, min_periods=3).std().shift(1).fillna(0)
        lower_band = baseline - (k_std * std_dev)
        lower_band = lower_band.clip(lower=0)
        
        # Check últimos 'consecutive_below' meses
        last_m_months = group.tail(consecutive_below)
        last_m_lower = lower_band.tail(consecutive_below)
        last_m_baseline = baseline.tail(consecutive_below)
        
        if len(last_m_months) == consecutive_below:
            is_below = (last_m_months['value'] <= last_m_lower).all()
            
            if is_below and last_m_baseline.mean() > 100:
                tip_info = tip_dict.get((cid, subf), {'tipologia': 'marginal', 'sow': 1.0})
                tip = tip_info['tipologia']
                sow = tip_info['sow']

                if tip in ['loyal', 'promiscuous', 'at_risk']:
                    mean_val = float(last_m_baseline.iloc[-1]) if not np.isnan(last_m_baseline.iloc[-1]) else 0.0
                    curr_val = float(last_m_months['value'].mean())
                    drop_amount = mean_val - curr_val
                    drop_pct = float(drop_amount / mean_val) if mean_val > 0 else 0.0

                    if drop_pct < drop_pct_min:
                        continue

                    alerts_raw.append({
                        'client_id': cid,
                        'subfamily': subf,
                        'tipo': 'DETERIORO_SOSTENIDO',
                        'tipologia_cliente': tip,
                        'mean_val': mean_val,
                        'curr_val': curr_val,
                        'drop_amount': drop_amount,
                        'drop_pct': drop_pct,
                        'sow': sow,
                    })

    df_alerts = pd.DataFrame(alerts_raw)
    if df_alerts.empty:
        return pd.DataFrame()

    # Prioridad: percentil global del impacto económico absoluto
    df_alerts['prioridad_score'] = df_alerts['drop_amount'].rank(pct=True) * 100

    alerts_final = []
    for _, row in df_alerts.iterrows():
        motivo = (
            f"Deterioro sostenido: {consecutive_below} meses cayendo. "
            f"Media habitual {row['mean_val']:.0f}€, actual {row['curr_val']:.0f}€. "
            f"Pierdes {row['drop_amount']:.0f}€/mes ({row['drop_pct']*100:.0f}% de caída)."
        )
        features = {
            "baseline_6m": float(row['mean_val']),
            "recent_3m_avg": float(row['curr_val']),
            "drop_amount": float(row['drop_amount']),
            "drop_pct": float(row['drop_pct']),
            "drop_percentile_global": float(row['prioridad_score']),
            "sow_subfamily": float(row['sow']),
        }
        alerts_final.append({
            'client_id': row['client_id'],
            'subfamily': row['subfamily'],
            'tipo': row['tipo'],
            'tipologia_cliente': row['tipologia_cliente'],
            'motivo': motivo,
            'prioridad_score': float(row['prioridad_score']),
            'features_json': json.dumps(features),
        })

    return pd.DataFrame(alerts_final)

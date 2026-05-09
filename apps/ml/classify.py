"""Clasificación · capa analítica.

Asigna a cada (cliente × subfamilia) una tipología:
- loyal       → SoW > 0.7
- promiscuous → 0.2 < SoW <= 0.7
- at_risk     → era loyal/promiscuous y muestra deterioro reciente (últimos 6 meses vs anterior)
- marginal    → SoW <= 0.2
"""
from __future__ import annotations

import pandas as pd

LOYAL_SOW_MIN = 0.7
PROMISCUOUS_SOW_MIN = 0.2


def classify_client_subfam(transactions: pd.DataFrame, potential: pd.DataFrame, products: pd.DataFrame) -> pd.DataFrame:
    """Devuelve DataFrame con columnas: client_id, subfamilia, tipologia, sow."""
    # Filtrar solo ventas válidas
    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])].copy()
    ventas = ventas.merge(products[['product_id', 'subfamily', 'category']], on='product_id', how='left')
    
    # Ventas totales históricas por cliente y subfamilia
    ventas_totales = ventas.groupby(['client_id', 'subfamily', 'category'])['value'].sum().reset_index()
    
    # Unir con el potencial. El potencial viene por 'category', así que unimos por category
    merged = ventas_totales.merge(
        potential[['client_id', 'category', 'potential_annual']],
        on=['client_id', 'category'],
        how='left',
    )
    
    # Calcular SoW (Share of Wallet). Si el potencial es menor que las ventas reales o nulo, asumimos SoW = 1.0 (Loyal)
    merged['sow'] = merged['value'] / merged['potential_annual']
    merged['sow'] = merged['sow'].fillna(1.0)
    merged.loc[merged['sow'] > 1.0, 'sow'] = 1.0
    
    # Asignar tipología base
    merged['tipologia'] = 'marginal'
    merged.loc[merged['sow'] > PROMISCUOUS_SOW_MIN, 'tipologia'] = 'promiscuous'
    merged.loc[merged['sow'] > LOYAL_SOW_MIN, 'tipologia'] = 'loyal'
    
    # Calcular 'at_risk': caída del 50% en los últimos 6 meses vs los 6 meses anteriores
    max_date = pd.to_datetime(ventas['date']).max()
    date_6m_ago = max_date - pd.DateOffset(months=6)
    date_12m_ago = max_date - pd.DateOffset(months=12)
    
    v_last_6m = ventas[pd.to_datetime(ventas['date']) > date_6m_ago].groupby(['client_id', 'subfamily'])['value'].sum().reset_index(name='val_6m')
    v_prev_6m = ventas[(pd.to_datetime(ventas['date']) <= date_6m_ago) & (pd.to_datetime(ventas['date']) > date_12m_ago)].groupby(['client_id', 'subfamily'])['value'].sum().reset_index(name='val_prev_6m')
    
    risk_df = v_prev_6m.merge(v_last_6m, on=['client_id', 'subfamily'], how='left')
    risk_df['val_6m'] = risk_df['val_6m'].fillna(0)
    
    # Consideramos at_risk si prev_6m era decente (> 100€) y ha caído a menos de la mitad
    risk_df['is_at_risk'] = (risk_df['val_prev_6m'] > 100) & (risk_df['val_6m'] < (risk_df['val_prev_6m'] * 0.5))
    
    # Actualizar tipología
    merged = merged.merge(risk_df[['client_id', 'subfamily', 'is_at_risk']], on=['client_id', 'subfamily'], how='left')
    merged['is_at_risk'] = merged['is_at_risk'].fillna(False)
    
    merged.loc[merged['is_at_risk'] & (merged['tipologia'].isin(['loyal', 'promiscuous'])), 'tipologia'] = 'at_risk'
    
    return merged[['client_id', 'subfamily', 'category', 'tipologia', 'sow']]


def segment_clients(transactions: pd.DataFrame, use_kmeans: bool = True) -> pd.DataFrame:
    """Devuelve DataFrame con: client_id, clinic_segment.

    E0bis: KMeans sobre 3 features RFM (Recency-Frequency-Monetary).
    Fallback a reglas por percentil si use_kmeans=False.
    """
    ventas = transactions[(~transactions["is_return"]) & (~transactions["is_zero"])].copy()
    ventas["date"] = pd.to_datetime(ventas["date"])
    today = ventas["date"].max()

    rfm = ventas.groupby("client_id").agg(
        total_value=("value", "sum"),
        n_purchases=("transaction_id", "count"),
        last_purchase=("date", "max"),
    ).reset_index()
    rfm["recency_days"] = (today - rfm["last_purchase"]).dt.days

    if use_kmeans:
        from sklearn.cluster import KMeans
        from sklearn.preprocessing import StandardScaler

        X = StandardScaler().fit_transform(rfm[["total_value", "n_purchases", "recency_days"]])
        km = KMeans(n_clusters=4, random_state=42, n_init=10)
        rfm["cluster"] = km.fit_predict(X)

        # Rankear clusters por valor promedio (mayor valor → mejor segmento)
        rank = (
            rfm.groupby("cluster")["total_value"]
            .mean()
            .rank(ascending=False)
            .astype(int)
        )
        labels = {c: ["VIP", "Standard", "Occasional", "Inactive"][r - 1] for c, r in rank.items()}
        rfm["clinic_segment"] = rfm["cluster"].map(labels)
    else:
        p90 = rfm["total_value"].quantile(0.90)
        p50 = rfm["total_value"].quantile(0.50)
        rfm["clinic_segment"] = "Tier 3 (Bottom 50%)"
        rfm.loc[rfm["total_value"] > p50, "clinic_segment"] = "Tier 2 (Mid 40%)"
        rfm.loc[rfm["total_value"] > p90, "clinic_segment"] = "Tier 1 (Top 10%)"

    return rfm[["client_id", "clinic_segment"]]

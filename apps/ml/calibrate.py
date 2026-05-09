"""Calibración de umbrales · F3.

Ejecuta el pipeline con distintas combinaciones de parámetros y muestra
la distribución de alertas generadas. Úsalo para verificar que las alertas
están balanceadas por tipología, subfamilia y provincia antes de ajustar
los umbrales en run_signals.py.

Usage:
    python calibrate.py
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine


def _load_db(engine):
    transactions = pd.read_sql("SELECT * FROM transactions", engine)
    for col in ["is_return", "is_zero", "is_outlier"]:
        if col in transactions.columns:
            transactions[col] = transactions[col].astype(bool)
    potential = pd.read_sql("SELECT * FROM client_potential", engine)
    products = pd.read_sql("SELECT * FROM products", engine)
    clients = pd.read_sql("SELECT client_id, province FROM clients", engine)
    return transactions, potential, products, clients


def _run_combo(transactions, tipologia, products, k_std_c, z_pmin, k_std_t, consec, drop_pct):
    from signals_commodity import detect_commodity_signals
    from signals_technical import detect_technical_signals

    comm = detect_commodity_signals(
        transactions, tipologia, products,
        k_std=k_std_c, z_percentile_min=z_pmin,
    )
    tech = detect_technical_signals(
        transactions, tipologia, products,
        k_std=k_std_t, consecutive_below=consec, drop_pct_min=drop_pct,
    )
    return comm, tech


def _distribution(df: pd.DataFrame, clients: pd.DataFrame, label: str) -> None:
    if df.empty:
        print(f"  {label}: 0 alertas\n")
        return
    print(f"  {label}: {len(df)} alertas")

    if "tipologia_cliente" in df.columns:
        by_tip = df["tipologia_cliente"].value_counts()
        print(f"    tipología:  {by_tip.to_dict()}")

    if "subfamily" in df.columns:
        by_sub = df["subfamily"].value_counts()
        print(f"    subfamilia: {by_sub.to_dict()}")

    merged = df.merge(clients, on="client_id", how="left")
    if "province" in merged.columns:
        top_prov = merged["province"].value_counts().head(5).to_dict()
        print(f"    top-5 prov: {top_prov}")
    print()


def main() -> None:
    from dotenv import load_dotenv
    load_dotenv()

    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        db_path = Path(__file__).resolve().parent.parent.parent / "pulse_dev.db"
        db_url = f"sqlite:///{db_path}"

    engine = create_engine(db_url)
    print("Cargando datos de BD...")
    transactions, potential, products, clients = _load_db(engine)

    from classify import classify_client_subfam
    tipologia = classify_client_subfam(transactions, potential, products)

    print(f"\nBase: {len(tipologia)} pares cliente×subfamilia")
    print("Tipologías:")
    print(tipologia["tipologia"].value_counts().to_string())

    # -----------------------------------------------------------------------
    # Barrido de parámetros
    # Columnas: k_std_c, z_pmin, k_std_t, consec, drop_pct
    combos = [
        (1.0,  0,  1.0, 3, 0.00),  # baseline sin filtros adicionales
        (1.0, 50,  1.0, 3, 0.00),  # z_pmin moderado
        (1.0, 60,  1.0, 3, 0.20),  # configuración de producción (run_signals.py)
        (1.0, 75,  1.0, 3, 0.20),  # más restrictivo
        (1.5,  0,  1.0, 3, 0.20),  # k_std más alto
        (1.0, 60,  1.0, 4, 0.20),  # technical más estricto
    ]

    print("\n" + "=" * 80)
    header = f"{'Parámetros':<40} {'Commodity':>10} {'Technical':>10} {'Total':>10}"
    print(header)
    print("=" * 80)

    for i, (k_c, z_p, k_t, cons, dpct) in enumerate(combos):
        label = f"k_c={k_c} z_pmin={z_p} k_t={k_t} cons={cons} drop={dpct}"
        comm, tech = _run_combo(transactions, tipologia, products, k_c, z_p, k_t, cons, dpct)
        marker = "  ← PRODUCCIÓN" if i == 2 else ""
        print(f"{label:<40} {len(comm):>10} {len(tech):>10} {len(comm)+len(tech):>10}{marker}")

    # -----------------------------------------------------------------------
    # Distribución detallada de la config de producción
    print("\n--- Distribución detallada (config producción: k_c=1.0 z_pmin=60 drop=0.20) ---\n")
    comm_p, tech_p = _run_combo(transactions, tipologia, products, 1.0, 60, 1.0, 3, 0.20)
    _distribution(comm_p, clients, "Commodity")
    _distribution(tech_p, clients, "Technical")

    # -----------------------------------------------------------------------
    # Check de balance geográfico
    all_alerts = pd.concat(
        [df for df in (comm_p, tech_p) if not df.empty], ignore_index=True
    )
    if not all_alerts.empty:
        geo = all_alerts.merge(clients, on="client_id", how="left")
        prov_counts = geo["province"].value_counts()
        total = len(prov_counts)
        top5_share = prov_counts.head(5).sum() / len(all_alerts) * 100
        print(f"Provincias con alertas: {total}")
        print(f"Concentración top-5 provincias: {top5_share:.1f}% del total")
        if top5_share > 60:
            print("  ⚠ Alta concentración geográfica — revisar si refleja la base real de clientes")
        else:
            print("  ✓ Distribución geográfica razonable")


if __name__ == "__main__":
    main()

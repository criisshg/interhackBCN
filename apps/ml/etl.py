"""ETL · capa de datos.

Carga los 5 CSVs de `data/raw/` en Postgres con limpieza:
- valores monetarios negativos (devoluciones) → flag is_return, preservados
- valores cero (cambios) → flag is_zero
- potenciales NA o absurdos (potencial < ventas reales) → potential_quality='low'
- outliers de volumen individual (>3 std) → flag is_outlier (post-carga)
"""
from __future__ import annotations

import os
from pathlib import Path

import pandas as pd
from sqlalchemy import create_engine

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw"


def load_csvs() -> dict[str, pd.DataFrame]:
    """Carga los 5 CSVs entregados por Inibsa."""
    return {
        "ventas": pd.read_csv(DATA_DIR / "ventas.csv"),
        "productos": pd.read_csv(DATA_DIR / "productos.csv"),
        "clientes": pd.read_csv(DATA_DIR / "clientes.csv"),
        "potencial": pd.read_csv(DATA_DIR / "potencial.csv"),
        "campanas": pd.read_csv(DATA_DIR / "campañas.csv"),
    }


def clean_ventas(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["is_return"] = df["valor"] < 0
    df["is_zero"] = df["valor"] == 0
    df["fecha"] = pd.to_datetime(df["fecha"]).dt.date
    return df


def clean_potencial(df: pd.DataFrame, ventas_total_by_client_subfam: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["potential_quality"] = "ok"
    df.loc[df["potencial_anual"].isna(), "potential_quality"] = "low"
    merged = df.merge(ventas_total_by_client_subfam, on=["client_id", "subfamilia"], how="left")
    df.loc[
        merged["valor_total"].notna() & (df["potencial_anual"] < merged["valor_total"]),
        "potential_quality",
    ] = "low"
    return df


def main() -> None:
    db_url = os.environ["DATABASE_URL"]
    engine = create_engine(db_url)

    raw = load_csvs()
    ventas = clean_ventas(raw["ventas"])

    ventas_agg = (
        ventas[~ventas["is_return"]]
        .groupby(["client_id", "subfamilia"], as_index=False)["valor"]
        .sum()
        .rename(columns={"valor": "valor_total"})
    )
    potencial = clean_potencial(raw["potencial"], ventas_agg)

    raw["clientes"].to_sql("clients", engine, if_exists="replace", index=False)
    raw["productos"].to_sql("products", engine, if_exists="replace", index=False)
    potencial.to_sql("client_potential", engine, if_exists="replace", index=False)
    ventas.to_sql("transactions", engine, if_exists="replace", index=False)
    raw["campanas"].to_sql("campaigns", engine, if_exists="replace", index=False)


if __name__ == "__main__":
    main()

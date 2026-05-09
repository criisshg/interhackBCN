"""ETL · capa de datos.

Carga los 5 CSVs de `data/raw/` en Postgres con limpieza y renombrado de columnas.
- valores monetarios negativos (devoluciones) → flag is_return, preservados
- valores cero (cambios) → flag is_zero
- potenciales NA o absurdos (potencial < ventas reales) → potential_quality='low'
- outliers de volumen individual (>3 std) → flag is_outlier (post-carga)
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import create_engine

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw"


def load_raw_data() -> dict[str, pd.DataFrame]:
    """Carga los 5 CSVs entregados por Inibsa y estandariza los nombres de columnas."""
    
    # 1. Ventas
    ventas = pd.read_csv(DATA_DIR / "ventas.csv", encoding='latin1', on_bad_lines='skip', low_memory=False)
    ventas = ventas.rename(columns={
        'Num.Fact': 'transaction_id',
        'Fecha': 'date',
        'Id. Cliente': 'client_id',
        'Id. Producto': 'product_id',
        'Unidades': 'units',
        'Valores_H': 'value'
    })
    # Limpiar moneda
    ventas['value'] = ventas['value'].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False).astype(float)
    ventas['date'] = pd.to_datetime(ventas['date'], format='%m/%d/%Y', errors='coerce').dt.date
    
    # 2. Productos
    productos = pd.read_csv(DATA_DIR / "productos.csv", encoding='latin1')
    productos.columns = ['product_id', 'analytical_block', 'category', 'subfamily']
    
    # 3. Clientes
    clientes = pd.read_csv(DATA_DIR / "clientes.csv", encoding='latin1')
    clientes = clientes.rename(columns={
        'Id. Cliente': 'client_id',
        'Unnamed: 1': 'region_code',
        'Provincia': 'province'
    })
    
    # 4. Potencial
    potencial = pd.read_csv(DATA_DIR / "potencial.csv", encoding='latin1')
    potencial = potencial.rename(columns={
        'Id.Cliente': 'client_id',
        'Familia': 'family',
        'Categoria Productos': 'category',
        'Potencial_H': 'potential_annual'
    })
    # Limpiar moneda y NaN
    potencial['potential_annual'] = potencial['potential_annual'].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False).astype(float)
    
    # 5. Campañas
    campanas = pd.read_csv(DATA_DIR / "campañas.csv", encoding='latin1')
    campanas = campanas.rename(columns={
        'Campaña': 'campaign_id',
        'Fecha inicio': 'start_date',
        'Fecha fin': 'end_date'
    })
    campanas['start_date'] = pd.to_datetime(campanas['start_date'], format='%m/%d/%Y', errors='coerce').dt.date
    campanas['end_date'] = pd.to_datetime(campanas['end_date'], format='%m/%d/%Y', errors='coerce').dt.date

    return {
        "ventas": ventas,
        "productos": productos,
        "clientes": clientes,
        "potencial": potencial,
        "campanas": campanas,
    }


def add_flags_ventas(df: pd.DataFrame) -> pd.DataFrame:
    """Añade flags de devoluciones, ceros y outliers."""
    df = df.copy()
    df["is_return"] = df["value"] < 0
    df["is_zero"] = df["value"] == 0
    
    # Calcular outliers por cliente (Z-score > 3 de su volumen de compra habitual)
    # Excluimos devoluciones y ceros para no afectar la media de compras normales
    compras = df[(~df["is_return"]) & (~df["is_zero"])].copy()
    
    # Evitar divisiones por cero o std = NaN (clientes con 1 sola compra)
    mean_val = compras.groupby('client_id')['value'].transform('mean')
    std_val = compras.groupby('client_id')['value'].transform('std').fillna(1.0)
    
    compras['z_score'] = np.abs((compras['value'] - mean_val) / std_val)
    compras['is_outlier'] = compras['z_score'] > 3
    
    # Asignar flag al dataframe principal (usando index para no alterar el orden/filas)
    df['is_outlier'] = False
    df.loc[compras.index, 'is_outlier'] = compras['is_outlier']
    
    return df


def clean_potencial(df: pd.DataFrame, ventas: pd.DataFrame, productos: pd.DataFrame) -> pd.DataFrame:
    """Marca calidad del potencial comparándolo con ventas reales."""
    df = df.copy()
    df["potential_quality"] = "ok"
    df.loc[df["potential_annual"].isna(), "potential_quality"] = "low"
    df.loc[df["potential_annual"] <= 0, "potential_quality"] = "low"
    
    # Cruzar ventas con productos para sacar la categoría de cada venta
    ventas_prod = ventas[~ventas["is_return"]].copy()
    ventas_prod = ventas_prod.merge(productos, on="product_id", how="left")
    
    # Extraer el año para no sumar los 5 años enteros
    ventas_prod['year'] = pd.to_datetime(ventas_prod['date']).dt.year
    
    # Ventas totales por cliente, categoría y AÑO
    ventas_por_año = ventas_prod.groupby(["client_id", "category", "year"])["value"].sum().reset_index()
    
    # Nos quedamos con el mejor año de cada cliente para esa categoría
    max_ventas_anuales = ventas_por_año.groupby(["client_id", "category"])["value"].max().reset_index()
    max_ventas_anuales = max_ventas_anuales.rename(columns={"value": "max_annual_value"})
    
    # Merge con potencial
    merged = df.merge(max_ventas_anuales, on=["client_id", "category"], how="left")
    
    # Si sus ventas reales en UN SOLO AÑO ya superan el potencial actual estimado, el potencial está mal calculado (se queda corto)
    df.loc[
        merged["max_annual_value"].notna() & (df["potential_annual"] < merged["max_annual_value"]),
        "potential_quality",
    ] = "low"
    
    return df


def main() -> None:
    from dotenv import load_dotenv
    load_dotenv()
    
    # Obtener URL o usar SQLite local para pruebas si no hay DATABASE_URL configurada en el .env
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL no encontrada en entorno. Usando base de datos SQLite local para desarrollo.")
        # Creamos una bbdd local en la raíz del proyecto
        db_path = Path(__file__).resolve().parent.parent.parent / "pulse_dev.db"
        db_url = f"sqlite:///{db_path}"
        
    engine = create_engine(db_url)
    
    print("1. Cargando y estandarizando CSVs...")
    raw = load_raw_data()
    
    print("2. Procesando ventas (añadiendo flags is_return, is_zero, is_outlier)...")
    ventas = add_flags_ventas(raw["ventas"])
    
    print("3. Evaluando calidad de potenciales (potential_quality)...")
    potencial = clean_potencial(raw["potencial"], ventas, raw["productos"])
    
    print("4. Escribiendo en base de datos (Idempotente)...")
    from sqlalchemy import text
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE clients CASCADE"))
        conn.execute(text("TRUNCATE TABLE products CASCADE"))
        conn.execute(text("TRUNCATE TABLE client_potential CASCADE"))
        conn.execute(text("TRUNCATE TABLE transactions CASCADE"))
        conn.execute(text("TRUNCATE TABLE campaigns CASCADE"))

    # Limpieza de Foreign Keys para Postgres: asegurar que todos los IDs existan
    valid_clients = set(raw["clientes"]["client_id"])
    potencial = potencial[potencial["client_id"].isin(valid_clients)]
    ventas = ventas[ventas["client_id"].isin(valid_clients)]
    
    # También limpiar product_id en ventas
    valid_products = set(raw["productos"]["product_id"])
    ventas = ventas[ventas["product_id"].isin(valid_products)]

    raw["clientes"].drop_duplicates(subset=['client_id']).to_sql("clients", engine, if_exists="append", index=False)
    raw["productos"].drop_duplicates(subset=['product_id']).to_sql("products", engine, if_exists="append", index=False)
    potencial.drop_duplicates(subset=['client_id', 'family', 'category']).to_sql("client_potential", engine, if_exists="append", index=False)
    ventas.to_sql("transactions", engine, if_exists="append", index=False)
    raw["campanas"].to_sql("campaigns", engine, if_exists="append", index=False)
    
    print(f"ETL completada con éxito. Tablas guardadas en: {db_url}")
    
    # Imprimir esquema para notificar a P2
    schema_info = {
        "clients": list(raw["clientes"].columns),
        "products": list(raw["productos"].columns),
        "client_potential": list(potencial.columns),
        "transactions": list(ventas.columns),
        "campaigns": list(raw["campanas"].columns)
    }
    print("\n" + "="*50)
    print(" SCHEMA FINAL PARA P2 (Big Yahu)")
    print("="*50)
    for table, cols in schema_info.items():
        print(f"Tabla '{table}': {', '.join(cols)}")


if __name__ == "__main__":
    main()

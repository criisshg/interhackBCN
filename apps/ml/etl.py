"""ETL · capa de datos.

Carga los 5 CSVs de `data/raw/` en Postgres con limpieza y renombrado de columnas.
- valores monetarios negativos (devoluciones) → flag is_return, preservados
- valores cero (cambios) → flag is_zero
- potenciales NA o absurdos (potencial < ventas reales) → potential_quality='low'
- outliers de volumen individual (>3 std) → flag is_outlier (post-carga)
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from io import StringIO

import numpy as np
import pandas as pd
from sqlalchemy import create_engine

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data" / "raw"


def _extract_code(raw: str) -> str:
    """Extrae el código alfanumérico de un label jerárquico.

    'Categoria C1' → 'C1' · 'Familia T2' → 'T2' · 'Familia C1' → 'C1'
    """
    m = re.search(r'[A-Z]\d+', str(raw))
    return m.group(0) if m else str(raw).strip()


def load_raw_data() -> dict[str, pd.DataFrame]:
    """Carga los 5 CSVs entregados por Inibsa y estandariza los nombres de columnas."""
    
    # 1. Ventas
    ventas = pd.read_csv(DATA_DIR / "ventas.csv", on_bad_lines='skip', low_memory=False)
    ventas = ventas.rename(columns={
        'Fecha': 'date',
        'Id. Cliente': 'client_id',
        'Id. Producto': 'product_id',
        'Unidades': 'units',
        'Valores_H': 'value'
    })
    # Num.Fact identifica factura y puede repetirse en varias líneas. La tabla necesita
    # una PK por línea de transacción, así que generamos un id estable por fila.
    ventas.insert(0, 'transaction_id', range(1, len(ventas) + 1))
    ventas = ventas.drop(columns=['Num.Fact'])
    ventas['client_id'] = ventas['client_id'].astype(int)
    ventas['product_id'] = ventas['product_id'].astype(str)
    # Limpiar moneda
    ventas['value'] = ventas['value'].astype(str).str.replace('.', '', regex=False).str.replace(',', '.', regex=False).astype(float)
    ventas['date'] = pd.to_datetime(ventas['date'], format='%m/%d/%Y', errors='coerce').dt.date
    
    # 2. Productos — jerarquía canónica + aliases backward-compat
    _prod_raw = pd.read_csv(DATA_DIR / "productos.csv")
    _dynamics_map = {'Commodities': 'commodity', 'Productos Técnicos': 'technical'}
    productos = pd.DataFrame({
        'product_id':            _prod_raw.iloc[:, 0].astype(str),
        # canónicos
        'product_dynamics':      _prod_raw.iloc[:, 1].str.strip().map(_dynamics_map)
                                     .fillna(_prod_raw.iloc[:, 1].str.lower().str.strip()),
        'product_category_code': _prod_raw.iloc[:, 2].apply(_extract_code),
        'product_family_code':   _prod_raw.iloc[:, 3].apply(_extract_code),
        # backward-compat (mismo valor)
        'analytical_block':      _prod_raw.iloc[:, 1].str.strip().map(_dynamics_map)
                                     .fillna(_prod_raw.iloc[:, 1].str.lower().str.strip()),
        'category':              _prod_raw.iloc[:, 2].apply(_extract_code),
        'subfamily':             _prod_raw.iloc[:, 3].apply(_extract_code),
    })
    # product_category_name, product_family_name, product_display_name
    # se calculan en main() tras cargar potencial (necesitan el mapping de nombres)
    
    # 3. Clientes
    clientes = pd.read_csv(DATA_DIR / "clientes.csv", dtype={'Unnamed: 1': 'string'})
    clientes = clientes.rename(columns={
        'Id. Cliente': 'client_id',
        'Unnamed: 1': 'region_code',
        'Provincia': 'province'
    })
    clientes['client_id'] = clientes['client_id'].astype(int)
    clientes['region_code'] = clientes['region_code'].astype('string').str.zfill(5)
    clientes = clientes.drop_duplicates(subset=['client_id'], keep='first')
    
    # 4. Potencial — categoría normalizada a código
    _pot_raw = pd.read_csv(DATA_DIR / "potencial.csv")
    potencial = pd.DataFrame({
        'client_id':             _pot_raw['Id.Cliente'].astype(int),
        'family':                _pot_raw['Familia'].str.strip(),          # backward-compat
        'potential_family_name': _pot_raw['Familia'].str.strip(),          # canónico
        'category':              _pot_raw['Categoria Productos'].apply(_extract_code),  # C1/C2/T1
        'potential_annual':      (_pot_raw['Potencial_H']
                                      .astype(str)
                                      .str.replace('.', '', regex=False)
                                      .str.replace(',', '.', regex=False)
                                      .astype(float)),
    })
    
    # 5. Campañas
    campanas = pd.read_csv(DATA_DIR / "campañas.csv")
    campanas = campanas.rename(columns={
        'Campaña': 'campaign_id',
        'Fecha inicio': 'start_date',
        'Fecha fin': 'end_date'
    })
    campanas['start_date'] = pd.to_datetime(campanas['start_date'], format='%m/%d/%Y', errors='coerce').dt.date
    campanas['end_date'] = pd.to_datetime(campanas['end_date'], format='%m/%d/%Y', errors='coerce').dt.date

    # Algunas tablas de negocio contienen clientes que no vienen en la maestra
    # `clientes.csv`. Para mantener claves foráneas sin perder ventas/potencial,
    # añadimos esos IDs con localización desconocida.
    all_client_ids = pd.Index(clientes['client_id'])
    all_client_ids = all_client_ids.union(pd.Index(ventas['client_id']))
    all_client_ids = all_client_ids.union(pd.Index(potencial['client_id']))
    missing_client_ids = all_client_ids.difference(pd.Index(clientes['client_id']))
    if len(missing_client_ids) > 0:
        missing_clients = pd.DataFrame({
            'client_id': missing_client_ids.astype(int),
            'region_code': pd.NA,
            'province': pd.NA,
        })
        clientes = pd.concat([clientes, missing_clients], ignore_index=True)

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

    print("3.5. Enriqueciendo jerarquía de productos con nombres comerciales...")
    productos = raw["productos"].copy()
    # Mapping código → nombre comercial (de potencial.csv · Familia column)
    cat_name_map = (
        potencial.drop_duplicates("category")
                 .set_index("category")["potential_family_name"]
                 .to_dict()
    )  # {'C1': 'Anestesia', 'C2': 'Bioseguridad', 'T1': 'Biomateriales'}

    productos["product_category_name"] = (
        productos["product_category_code"].map(cat_name_map)
        .fillna(productos["product_category_code"])
    )

    def _family_name(row: pd.Series) -> str:
        if row["product_dynamics"] == "commodity":
            return row["product_category_name"]
        return f"{row['product_category_name']} · Familia {row['product_family_code']}"

    def _display_name(row: pd.Series) -> str:
        if row["product_dynamics"] == "commodity":
            return f"{row['product_family_code']} · {row['product_category_name']}"
        return (
            f"{row['product_family_code']} · {row['product_category_name']}"
            f" · Familia {row['product_family_code']}"
        )

    productos["product_family_name"]  = productos.apply(_family_name, axis=1)
    productos["product_display_name"] = productos.apply(_display_name, axis=1)
    
    print("4. Escribiendo en base de datos (Idempotente)...")
    from sqlalchemy import text
    try:
        with engine.begin() as conn:
            conn.execute(text("SET statement_timeout = 0"))
            conn.execute(text(
                "TRUNCATE TABLE actions, alerts, client_status, transactions, "
                "client_potential, campaigns, products, clients "
                "RESTART IDENTITY CASCADE"
            ))
    except Exception as e:
        print(f"Nota: No se pudieron truncar las tablas (probablemente SQLite vacío). Error: {e}")

    # FK safety: descartar huérfanos antes de insertar
    valid_clients = set(raw["clientes"]["client_id"])
    valid_products = set(raw["productos"]["product_id"])
    potencial = potencial[potencial["client_id"].isin(valid_clients)]
    ventas = ventas[ventas["client_id"].isin(valid_clients) & ventas["product_id"].isin(valid_products)]

    write_table(raw["clientes"].drop_duplicates(subset=["client_id"]), "clients", engine)
    write_table(productos.drop_duplicates(subset=["product_id"]), "products", engine)
    write_table(potencial.drop_duplicates(subset=["client_id", "family", "category"]), "client_potential", engine)
    write_table(ventas, "transactions", engine)
    write_table(raw["campanas"], "campaigns", engine)
    
    print("ETL completada con éxito. Tablas guardadas en la base configurada.")
    
    # Imprimir esquema para notificar a P2
    schema_info = {
        "clients": list(raw["clientes"].columns),
        "products": list(productos.columns),
        "client_potential": list(potencial.columns),
        "transactions": list(ventas.columns),
        "campaigns": list(raw["campanas"].columns),
    }
    print("\n" + "="*50)
    print(" SCHEMA FINAL PARA P2 (Big Yahu)")
    print("="*50)
    for table, cols in schema_info.items():
        print(f"Tabla '{table}': {', '.join(cols)}")


def write_table(df: pd.DataFrame, table_name: str, engine) -> None:
    if engine.dialect.name != "postgresql":
        df.to_sql(table_name, engine, if_exists="append", index=False)
        return

    buffer = StringIO()
    df.to_csv(buffer, index=False, header=False, na_rep="", date_format="%Y-%m-%d")
    buffer.seek(0)
    columns = ", ".join(f'"{column}"' for column in df.columns)
    sql = f'COPY "{table_name}" ({columns}) FROM STDIN WITH (FORMAT CSV, NULL \'\')'

    raw_connection = engine.raw_connection()
    try:
        with raw_connection.cursor() as cursor:
            cursor.copy_expert(sql, buffer)
        raw_connection.commit()
    except Exception:
        raw_connection.rollback()
        raise
    finally:
        raw_connection.close()


if __name__ == "__main__":
    main()

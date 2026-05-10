"""enrich product hierarchy

Revision ID: 0002_enrich_product_hierarchy
Revises: 0001_initial_schema
Create Date: 2026-05-10

Añade columnas canónicas a `products` y `client_potential` para reflejar
la jerarquía real: Bloque → Categoría → Familia/Subfamilia → SKU.

Los aliases backward-compat (analytical_block, category, subfamily) se mantienen
con los mismos NOMBRES pero ahora almacenan valores normalizados:
  analytical_block: 'commodity' | 'technical'
  category:         'C1' | 'C2' | 'T1'
  subfamily:        'C1' | 'C2' | 'T1' | 'T2'
"""
import sqlalchemy as sa
from alembic import op

revision = "0002_enrich_product_hierarchy"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Nuevas columnas canónicas en products
    for col in [
        "product_dynamics",       # 'commodity' | 'technical'
        "product_category_code",  # 'C1' | 'C2' | 'T1'
        "product_category_name",  # 'Anestesia' | 'Bioseguridad' | 'Biomateriales'
        "product_family_code",    # 'C1' | 'C2' | 'T1' | 'T2'
        "product_family_name",    # nombre humano de la familia
        "product_display_name",   # texto corto para UI
    ]:
        op.add_column("products", sa.Column(col, sa.String(), nullable=True))

    # Nueva columna en client_potential
    op.add_column(
        "client_potential",
        sa.Column("potential_family_name", sa.String(), nullable=True),
    )


def downgrade() -> None:
    for col in [
        "product_dynamics",
        "product_category_code",
        "product_category_name",
        "product_family_code",
        "product_family_name",
        "product_display_name",
    ]:
        op.drop_column("products", col)

    op.drop_column("client_potential", "potential_family_name")

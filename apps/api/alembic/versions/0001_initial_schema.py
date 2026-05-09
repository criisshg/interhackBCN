"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-09
"""
import sqlalchemy as sa
from alembic import op


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "clients",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("codigo_postal", sa.String(), nullable=True),
        sa.Column("provincia", sa.String(), nullable=True),
        sa.Column("clinic_segment", sa.String(), nullable=True),
        sa.Column("delegado_inferido", sa.String(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "products",
        sa.Column("sku", sa.String(), nullable=False),
        sa.Column("subfamilia", sa.String(), nullable=False),
        sa.Column("familia", sa.String(), nullable=False),
        sa.Column("es_commodity", sa.Boolean(), nullable=False),
        sa.PrimaryKeyConstraint("sku"),
    )
    op.create_table(
        "campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fecha_inicio", sa.Date(), nullable=False),
        sa.Column("fecha_fin", sa.Date(), nullable=False),
        sa.Column("productos_afectados", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "client_potential",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("subfamilia", sa.String(), nullable=False),
        sa.Column("potencial_anual", sa.Float(), nullable=True),
        sa.Column("potential_quality", sa.String(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("sku", sa.String(), nullable=False),
        sa.Column("fecha", sa.Date(), nullable=False),
        sa.Column("unidades", sa.Integer(), nullable=False),
        sa.Column("valor", sa.Float(), nullable=False),
        sa.Column("is_return", sa.Boolean(), nullable=False),
        sa.Column("is_zero", sa.Boolean(), nullable=False),
        sa.Column("is_outlier", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.ForeignKeyConstraint(["sku"], ["products.sku"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_transactions_client_fecha",
        "transactions",
        ["client_id", "fecha"],
    )
    op.create_table(
        "alerts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=False),
        sa.Column("client_id", sa.Integer(), nullable=False),
        sa.Column("subfamilia", sa.String(), nullable=False),
        sa.Column("tipo_dinamica", sa.String(), nullable=False),
        sa.Column("tipologia_cliente", sa.String(), nullable=False),
        sa.Column("motivo", sa.String(), nullable=False),
        sa.Column("urgencia_dias", sa.Integer(), nullable=False),
        sa.Column("prioridad_score", sa.Float(), nullable=False),
        sa.Column("impacto_estimado", sa.Float(), nullable=False),
        sa.Column("canal_recomendado", sa.String(), nullable=False),
        sa.Column("gestor_responsable", sa.String(), nullable=False),
        sa.Column("plazo_dias", sa.Integer(), nullable=False),
        sa.Column("estado", sa.String(), nullable=False),
        sa.Column("features_json", sa.JSON(), nullable=True),
        sa.ForeignKeyConstraint(["client_id"], ["clients.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_alerts_estado_tipologia",
        "alerts",
        ["estado", "tipologia_cliente"],
    )
    op.create_table(
        "actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("alert_id", sa.Integer(), nullable=False),
        sa.Column("ejecutado_por", sa.String(), nullable=False),
        sa.Column("fecha", sa.DateTime(), nullable=False),
        sa.Column("resultado", sa.String(), nullable=False),
        sa.Column("comentario", sa.String(), nullable=True),
        sa.ForeignKeyConstraint(["alert_id"], ["alerts.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("actions")
    op.drop_index("ix_alerts_estado_tipologia", table_name="alerts")
    op.drop_table("alerts")
    op.drop_index("ix_transactions_client_fecha", table_name="transactions")
    op.drop_table("transactions")
    op.drop_table("client_potential")
    op.drop_table("campaigns")
    op.drop_table("products")
    op.drop_table("clients")

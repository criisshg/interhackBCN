"""SQLModel schema. P2 expands and adds Alembic migrations.

Tablas que mapean a las 5 hojas/CSVs del Excel de Inibsa, más `alerts` y `actions`
generadas por el motor analítico.
"""
from datetime import date, datetime
from typing import Any

from sqlalchemy import Index
from sqlmodel import Field, JSON, Column, SQLModel


class Client(SQLModel, table=True):
    __tablename__ = "clients"
    client_id: int | None = Field(default=None, primary_key=True)
    region_code: str | None = None
    province: str | None = None
    clinic_segment: str | None = None  # P1: rule-based or KMeans (E0bis)
    inferred_sales_rep: str | None = None


class Product(SQLModel, table=True):
    __tablename__ = "products"
    product_id: str = Field(primary_key=True)
    analytical_block: str
    category: str
    subfamily: str


class ClientPotential(SQLModel, table=True):
    __tablename__ = "client_potential"
    client_id: int = Field(foreign_key="clients.client_id", primary_key=True)
    family: str = Field(primary_key=True)
    category: str = Field(primary_key=True)
    potential_annual: float | None = None
    potential_quality: str = "ok"  # ok | low (NA o absurdo)


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    __table_args__ = (Index("ix_transactions_client_date", "client_id", "date"),)
    transaction_id: int | None = Field(default=None, primary_key=True)
    date: date
    client_id: int = Field(foreign_key="clients.client_id")
    product_id: str = Field(foreign_key="products.product_id")
    units: int
    value: float  # ficticio, puede ser <0 (devolución) o 0 (cambio)
    is_return: bool = False
    is_zero: bool = False
    is_outlier: bool = False  # > 3 std individual


class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"
    campaign_id: str = Field(primary_key=True)
    start_date: date
    end_date: date


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"
    __table_args__ = (Index("ix_alerts_estado_tipologia", "estado", "tipologia_cliente"),)
    id: int | None = Field(default=None, primary_key=True)
    fecha: datetime
    client_id: int = Field(foreign_key="clients.client_id")
    subfamilia: str
    tipo_dinamica: str  # commodity | technical
    tipologia_cliente: str  # loyal | promiscuous | at_risk | marginal
    motivo: str  # legible
    urgencia_dias: int
    prioridad_score: float
    impacto_estimado: float
    canal_recomendado: str  # rep | telesales | marketing
    gestor_responsable: str
    plazo_dias: int
    estado: str = "nueva"  # nueva | en_curso | convertida | desestimada | expirada
    features_json: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))


class Action(SQLModel, table=True):
    __tablename__ = "actions"
    id: int | None = Field(default=None, primary_key=True)
    alert_id: int = Field(foreign_key="alerts.id")
    ejecutado_por: str
    fecha: datetime
    resultado: str  # convertida | desestimada | en_curso | expirada
    comentario: str | None = None

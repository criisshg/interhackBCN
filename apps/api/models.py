"""SQLModel schema. P2 expands and adds Alembic migrations.

Tablas que mapean a las 5 hojas/CSVs del Excel de Inibsa, más `alerts` y `actions`
generadas por el motor analítico.
"""
from datetime import date, datetime
from typing import Any

from sqlmodel import Field, JSON, Column, SQLModel


class Client(SQLModel, table=True):
    __tablename__ = "clients"
    id: int | None = Field(default=None, primary_key=True)
    codigo_postal: str | None = None
    provincia: str | None = None
    clinic_segment: str | None = None  # P1: rule-based or KMeans (E0bis)
    delegado_inferido: str | None = None


class Product(SQLModel, table=True):
    __tablename__ = "products"
    sku: str = Field(primary_key=True)
    subfamilia: str
    familia: str
    es_commodity: bool = False


class ClientPotential(SQLModel, table=True):
    __tablename__ = "client_potential"
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="clients.id")
    subfamilia: str
    potencial_anual: float | None = None
    potential_quality: str = "ok"  # ok | low (NA o absurdo)


class Transaction(SQLModel, table=True):
    __tablename__ = "transactions"
    id: int | None = Field(default=None, primary_key=True)
    client_id: int = Field(foreign_key="clients.id")
    sku: str = Field(foreign_key="products.sku")
    fecha: date
    unidades: int
    valor: float  # ficticio, puede ser <0 (devolución) o 0 (cambio)
    is_return: bool = False
    is_zero: bool = False
    is_outlier: bool = False  # > 3 std individual


class Campaign(SQLModel, table=True):
    __tablename__ = "campaigns"
    id: int | None = Field(default=None, primary_key=True)
    fecha_inicio: date
    fecha_fin: date
    productos_afectados: list[str] = Field(default_factory=list, sa_column=Column(JSON))


class Alert(SQLModel, table=True):
    __tablename__ = "alerts"
    id: int | None = Field(default=None, primary_key=True)
    fecha: datetime
    client_id: int = Field(foreign_key="clients.id")
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

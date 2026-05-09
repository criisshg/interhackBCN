from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from main import app
from database import get_session
from models import Alert, Client, Product, Transaction

from datetime import date, datetime


engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
SQLModel.metadata.create_all(engine)


def override_get_session():
    with Session(engine) as session:
        yield session


app.dependency_overrides[get_session] = override_get_session
client = TestClient(app)


def seed_data() -> None:
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        session.add(Client(id=1, codigo_postal="08001", provincia="Barcelona"))
        session.add(Client(id=2, codigo_postal="28001", provincia="Madrid"))
        session.add(Product(sku="A1", subfamilia="Categoria C1", familia="Familia C1", es_commodity=True))
        session.add(
            Transaction(
                id=1,
                client_id=1,
                sku="A1",
                fecha=date(2026, 5, 1),
                unidades=3,
                valor=120.0,
            )
        )
        session.add(
            Alert(
                id=10,
                fecha=datetime(2026, 5, 9, 10, 0, 0),
                client_id=1,
                subfamilia="Categoria C1",
                tipo_dinamica="commodity",
                tipologia_cliente="promiscuous",
                motivo="Gap relevante y ventana de captura abierta.",
                urgencia_dias=4,
                prioridad_score=900.0,
                impacto_estimado=3000.0,
                canal_recomendado="rep",
                gestor_responsable="delegado",
                plazo_dias=4,
                features_json={"sow": 0.42},
            )
        )
        session.add(
            Alert(
                id=11,
                fecha=datetime(2026, 5, 9, 11, 0, 0),
                client_id=2,
                subfamilia="Categoria T1",
                tipo_dinamica="technical",
                tipologia_cliente="at_risk",
                motivo="Deterioro sostenido.",
                urgencia_dias=12,
                prioridad_score=300.0,
                impacto_estimado=2400.0,
                canal_recomendado="telesales",
                gestor_responsable="inside sales",
                plazo_dias=12,
                features_json={"months_below": 3},
            )
        )
        session.commit()


def test_health() -> None:
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_list_alerts_with_filters_and_pagination() -> None:
    seed_data()
    r = client.get("/alerts", params={"provincia": "Barcelona", "limit": 1})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == 10


def test_get_alert_detail() -> None:
    seed_data()
    r = client.get("/alerts/10")
    assert r.status_code == 200
    body = r.json()
    assert body["cliente"]["provincia"] == "Barcelona"
    assert body["features_json"] == {"sow": 0.42}


def test_get_missing_alert_returns_404() -> None:
    seed_data()
    r = client.get("/alerts/999")
    assert r.status_code == 404
    assert r.json()["error"]["code"] == "http_error"


def test_get_client_profile_timeline_and_alerts() -> None:
    seed_data()
    r = client.get("/clients/1")
    assert r.status_code == 200
    body = r.json()
    assert body["provincia"] == "Barcelona"
    assert body["timeline"][0]["sku"] == "A1"
    assert body["alerts"][0]["id"] == 10


def test_register_action_updates_alert_state() -> None:
    seed_data()
    r = client.post(
        "/actions",
        json={
            "alert_id": 10,
            "ejecutado_por": "Big Yahu",
            "resultado": "convertida",
            "comentario": "Cliente reactivado",
        },
    )
    assert r.status_code == 200
    assert r.json()["estado"] == "convertida"

    detail = client.get("/alerts/10")
    assert detail.json()["estado"] == "convertida"


def test_stats_and_metrics() -> None:
    seed_data()
    client.post(
        "/actions",
        json={"alert_id": 10, "ejecutado_por": "Big Yahu", "resultado": "convertida"},
    )

    stats = client.get("/stats")
    assert stats.status_code == 200
    assert stats.json()["active_alerts"] == 1

    metrics = client.get("/metrics")
    assert metrics.status_code == 200
    assert metrics.json()["conversion_rate"] == 1.0

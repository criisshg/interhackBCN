from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlmodel import Session, col, select

from database import get_session
from models import Alert, Client

router = APIRouter()


@router.get("")
def list_alerts(
    tipo: str | None = None,
    tipologia: str | None = None,
    provincia: str | None = None,
    subfamilia: str | None = None,
    limit: int = 50,
    offset: int = 0,
    session: Session = Depends(get_session),
) -> dict:
    limit = min(max(limit, 1), 100)
    offset = max(offset, 0)

    filters = []
    if tipo:
        filters.append(Alert.tipo_dinamica == tipo)
    if tipologia:
        filters.append(Alert.tipologia_cliente == tipologia)
    if subfamilia:
        filters.append(Alert.subfamilia == subfamilia)
    if provincia:
        filters.append(Client.provincia == provincia)

    join_condition = col(Alert.client_id) == col(Client.id)
    statement = select(Alert, Client).join(Client, join_condition)
    count_statement = select(func.count()).select_from(Alert).join(Client, join_condition)
    for condition in filters:
        statement = statement.where(condition)
        count_statement = count_statement.where(condition)

    statement = statement.order_by(col(Alert.prioridad_score).desc()).offset(offset).limit(limit)

    total = session.exec(count_statement).one()
    rows = session.exec(statement).all()
    return {
        "items": [_alert_item(alert, client) for alert, client in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{alert_id}")
def get_alert(alert_id: int, session: Session = Depends(get_session)) -> dict:
    row = session.exec(
        select(Alert, Client)
        .join(Client, col(Alert.client_id) == col(Client.id))
        .where(Alert.id == alert_id)
    ).first()
    if row is None:
        raise HTTPException(status_code=404, detail=f"alert {alert_id} not found")

    alert, client = row
    return {
        **_alert_item(alert, client),
        "features_json": alert.features_json,
        "cliente": _client_snapshot(client),
    }


def _alert_item(alert: Alert, client: Client) -> dict:
    return {
        "id": alert.id,
        "fecha": alert.fecha.isoformat(),
        "client_id": alert.client_id,
        "provincia": client.provincia,
        "codigo_postal": client.codigo_postal,
        "subfamilia": alert.subfamilia,
        "tipo_dinamica": alert.tipo_dinamica,
        "tipologia_cliente": alert.tipologia_cliente,
        "motivo": alert.motivo,
        "urgencia_dias": alert.urgencia_dias,
        "prioridad_score": alert.prioridad_score,
        "impacto_estimado": alert.impacto_estimado,
        "canal_recomendado": alert.canal_recomendado,
        "gestor_responsable": alert.gestor_responsable,
        "plazo_dias": alert.plazo_dias,
        "estado": alert.estado,
    }


def _client_snapshot(client: Client) -> dict:
    return {
        "id": client.id,
        "codigo_postal": client.codigo_postal,
        "provincia": client.provincia,
        "clinic_segment": client.clinic_segment,
        "delegado_inferido": client.delegado_inferido,
    }

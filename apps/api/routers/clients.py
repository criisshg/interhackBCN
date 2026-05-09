from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select

from database import get_session
from models import Alert, Client, Product, Transaction

router = APIRouter()


@router.get("/{client_id}")
def get_client(client_id: int, session: Session = Depends(get_session)) -> dict:
    client = session.get(Client, client_id)
    if client is None:
        raise HTTPException(status_code=404, detail=f"client {client_id} not found")

    timeline_rows = session.exec(
        select(Transaction, Product)
        .join(Product, col(Transaction.sku) == col(Product.sku))
        .where(Transaction.client_id == client_id)
        .order_by(col(Transaction.fecha).desc())
        .limit(200)
    ).all()
    alerts = session.exec(
        select(Alert)
        .where(Alert.client_id == client_id)
        .where(col(Alert.estado).in_(["nueva", "en_curso"]))
        .order_by(col(Alert.prioridad_score).desc())
    ).all()

    return {
        "id": client.id,
        "codigo_postal": client.codigo_postal,
        "provincia": client.provincia,
        "clinic_segment": client.clinic_segment,
        "delegado_inferido": client.delegado_inferido,
        "timeline": [_timeline_item(transaction, product) for transaction, product in timeline_rows],
        "alerts": [_alert_item(alert) for alert in alerts],
    }


def _timeline_item(transaction: Transaction, product: Product) -> dict:
    return {
        "id": transaction.id,
        "fecha": transaction.fecha.isoformat(),
        "sku": transaction.sku,
        "familia": product.familia,
        "subfamilia": product.subfamilia,
        "unidades": transaction.unidades,
        "valor": transaction.valor,
        "is_return": transaction.is_return,
        "is_zero": transaction.is_zero,
        "is_outlier": transaction.is_outlier,
    }


def _alert_item(alert: Alert) -> dict:
    return {
        "id": alert.id,
        "fecha": alert.fecha.isoformat(),
        "subfamilia": alert.subfamilia,
        "tipo_dinamica": alert.tipo_dinamica,
        "tipologia_cliente": alert.tipologia_cliente,
        "motivo": alert.motivo,
        "urgencia_dias": alert.urgencia_dias,
        "prioridad_score": alert.prioridad_score,
        "impacto_estimado": alert.impacto_estimado,
        "estado": alert.estado,
    }

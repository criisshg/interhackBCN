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
        .join(Product, col(Transaction.product_id) == col(Product.product_id))
        .where(Transaction.client_id == client_id)
        .order_by(col(Transaction.date).desc())
        .limit(200)
    ).all()
    alerts = session.exec(
        select(Alert)
        .where(Alert.client_id == client_id)
        .where(col(Alert.estado).in_(["nueva", "en_curso"]))
        .order_by(col(Alert.prioridad_score).desc())
    ).all()

    return {
        "id": client.client_id,
        "client_id": client.client_id,
        "region_code": client.region_code,
        "codigo_postal": client.region_code,
        "province": client.province,
        "provincia": client.province,
        "clinic_segment": client.clinic_segment,
        "inferred_sales_rep": client.inferred_sales_rep,
        "delegado_inferido": client.inferred_sales_rep,
        "timeline": [_timeline_item(transaction, product) for transaction, product in timeline_rows],
        "alerts": [_alert_item(alert) for alert in alerts],
    }


def _timeline_item(transaction: Transaction, product: Product) -> dict:
    return {
        "id": transaction.transaction_id,
        "transaction_id": transaction.transaction_id,
        "date": transaction.date.isoformat(),
        "fecha": transaction.date.isoformat(),
        "product_id": transaction.product_id,
        "sku": transaction.product_id,
        "analytical_block": product.analytical_block,
        "category": product.category,
        "subfamily": product.subfamily,
        "subfamilia": product.subfamily,
        "units": transaction.units,
        "unidades": transaction.units,
        "value": transaction.value,
        "valor": transaction.value,
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

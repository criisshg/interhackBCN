from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, col, select

from database import get_session
from models import Alert

router = APIRouter()


@router.get("")
def get_stats(session: Session = Depends(get_session)) -> dict:
    active_states = ["nueva", "en_curso"]
    active_alerts = session.exec(
        select(func.count()).select_from(Alert).where(col(Alert.estado).in_(active_states))
    ).one()
    pipeline = session.exec(
        select(func.coalesce(func.sum(Alert.impacto_estimado), 0)).where(
            col(Alert.estado).in_(active_states)
        )
    ).one()
    urgent_alerts = session.exec(
        select(func.count())
        .select_from(Alert)
        .where(col(Alert.estado).in_(active_states))
        .where(Alert.urgencia_dias <= 7)
    ).one()

    by_tipologia = session.exec(
        select(Alert.tipologia_cliente, func.count())
        .where(col(Alert.estado).in_(active_states))
        .group_by(Alert.tipologia_cliente)
    ).all()
    by_tipo = session.exec(
        select(Alert.tipo_dinamica, func.count())
        .where(col(Alert.estado).in_(active_states))
        .group_by(Alert.tipo_dinamica)
    ).all()

    return {
        "active_alerts": active_alerts,
        "pipeline_eur": float(pipeline),
        "urgent_alerts": urgent_alerts,
        "by_tipologia": {key: count for key, count in by_tipologia},
        "by_tipo": {key: count for key, count in by_tipo},
    }

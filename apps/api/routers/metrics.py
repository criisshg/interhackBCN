from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlmodel import Session, col, select

from database import get_session
from models import Action, Alert

router = APIRouter()


@router.get("")
def get_metrics(session: Session = Depends(get_session)) -> dict:
    closed_results = ["convertida", "desestimada", "expirada"]
    closed = session.exec(
        select(func.count()).select_from(Action).where(col(Action.resultado).in_(closed_results))
    ).one()
    converted = session.exec(
        select(func.count()).select_from(Action).where(Action.resultado == "convertida")
    ).one()
    false_positive = session.exec(
        select(func.count()).select_from(Action).where(Action.resultado == "desestimada")
    ).one()
    in_progress = session.exec(
        select(func.count()).select_from(Action).where(Action.resultado == "en_curso")
    ).one()
    active_alerts = session.exec(
        select(func.count())
        .select_from(Alert)
        .where(col(Alert.estado).in_(["nueva", "en_curso"]))
    ).one()

    return {
        "conversion_rate": _rate(converted, closed),
        "false_positive_rate": _rate(false_positive, closed),
        "inactive_recovery_rate": _rate(converted, closed),
        "coverage_rate": _rate(in_progress + closed, active_alerts + closed),
        "actions": {
            "closed": closed,
            "converted": converted,
            "false_positive": false_positive,
            "in_progress": in_progress,
        },
    }


def _rate(numerator: int, denominator: int) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)

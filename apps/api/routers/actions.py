from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from database import get_session
from models import Action, Alert

router = APIRouter()


class ActionIn(BaseModel):
    alert_id: int
    ejecutado_por: str
    resultado: str  # convertida | desestimada | en_curso | expirada
    comentario: str | None = None


@router.post("")
def register_action(payload: ActionIn, session: Session = Depends(get_session)) -> dict:
    valid_results = {"convertida", "desestimada", "en_curso", "expirada"}
    if payload.resultado not in valid_results:
        raise HTTPException(
            status_code=422,
            detail=f"resultado must be one of {sorted(valid_results)}",
        )

    alert = session.get(Alert, payload.alert_id)
    if alert is None:
        raise HTTPException(status_code=404, detail=f"alert {payload.alert_id} not found")

    action = Action(
        alert_id=payload.alert_id,
        ejecutado_por=payload.ejecutado_por,
        fecha=datetime.now(timezone.utc),
        resultado=payload.resultado,
        comentario=payload.comentario,
    )
    alert.estado = payload.resultado
    session.add(action)
    session.add(alert)
    session.commit()
    session.refresh(action)

    return {"ok": True, "id": action.id, "alert_id": payload.alert_id, "estado": alert.estado}

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ActionIn(BaseModel):
    alert_id: int
    ejecutado_por: str
    resultado: str  # convertida | desestimada | en_curso | expirada
    comentario: str | None = None


@router.post("")
def register_action(payload: ActionIn) -> dict:
    # P2: persist + update alert.estado
    return {"ok": True, "alert_id": payload.alert_id}

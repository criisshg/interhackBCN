from fastapi import APIRouter

router = APIRouter()


@router.get("")
def list_alerts(
    tipo: str | None = None,
    tipologia: str | None = None,
    provincia: str | None = None,
    subfamilia: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> dict:
    # P2: implement real query
    return {"items": [], "total": 0, "limit": limit, "offset": offset}


@router.get("/{alert_id}")
def get_alert(alert_id: int) -> dict:
    # P2: implement detail with features_json + motivo + cliente snapshot
    return {"id": alert_id, "motivo": "", "features_json": {}}

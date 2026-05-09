from fastapi import APIRouter

router = APIRouter()


@router.get("/{client_id}")
def get_client(client_id: int) -> dict:
    # P2: client profile + timeline + active alerts
    return {"id": client_id, "timeline": [], "alerts": []}

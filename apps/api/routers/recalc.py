from fastapi import APIRouter

router = APIRouter()


@router.post("/run-recalc")
def run_recalc() -> dict:
    # P2: trigger ml.run_signals and return summary counts
    return {"ok": True, "alerts_generated": 0, "elapsed_seconds": 0.0}

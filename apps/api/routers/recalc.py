from fastapi import APIRouter
import ast
import subprocess
import sys
import time
from pathlib import Path

router = APIRouter()


@router.post("/run-recalc")
def run_recalc() -> dict:
    started = time.perf_counter()
    ml_dir = Path(__file__).resolve().parents[2] / "ml"
    result = subprocess.run(
        [sys.executable, "-m", "run_signals"],
        cwd=ml_dir,
        check=False,
        capture_output=True,
        text=True,
        timeout=120,
    )
    elapsed = round(time.perf_counter() - started, 3)

    summary: dict = {}
    if result.stdout.strip():
        try:
            parsed = ast.literal_eval(result.stdout.strip().splitlines()[-1])
            if isinstance(parsed, dict):
                summary = parsed
        except (SyntaxError, ValueError):
            summary = {"stdout": result.stdout.strip()}

    if result.returncode != 0:
        return {
            "ok": False,
            "alerts_generated": 0,
            "elapsed_seconds": elapsed,
            "error": result.stderr.strip() or "run_signals failed",
        }

    return {
        "ok": True,
        "alerts_generated": int(summary.get("alerts_generated", 0)),
        "elapsed_seconds": elapsed,
    }

"""Orquestador del recálculo diario.

Lee de Postgres, ejecuta classify + signals_commodity + signals_technical + scoring,
y vuelca en `alerts` (truncate + insert).
"""
from __future__ import annotations

import os
from sqlalchemy import create_engine, text


def main() -> dict[str, int]:
    db_url = os.environ["DATABASE_URL"]
    engine = create_engine(db_url)

    with engine.begin() as conn:
        conn.execute(text("TRUNCATE TABLE alerts"))
        # P1: pipeline real (load → classify → signals → scoring → insert)

    return {"alerts_generated": 0}


if __name__ == "__main__":
    summary = main()
    print(summary)

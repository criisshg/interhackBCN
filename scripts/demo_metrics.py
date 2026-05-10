from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from sqlmodel import Session, col, select

ROOT = Path(__file__).resolve().parents[1]
API_DIR = ROOT / "apps" / "api"
sys.path.insert(0, str(API_DIR))

from database import get_engine  # noqa: E402
from models import Action, Alert, Client  # noqa: E402


DEMO_MARK = "DEMO_METRICS"


def reset_demo(session: Session) -> dict[str, int]:
    demo_actions = session.exec(
        select(Action).where(col(Action.comentario).contains(f"{DEMO_MARK}:"))
    ).all()
    touched_alert_ids = {action.alert_id for action in demo_actions}

    for action in demo_actions:
        session.delete(action)

    reset_alerts = 0
    if touched_alert_ids:
        alerts = session.exec(select(Alert).where(col(Alert.id).in_(touched_alert_ids))).all()
        for alert in alerts:
            if alert.features_json.get("demo_metrics") is not True:
                alert.estado = "nueva"
                session.add(alert)
                reset_alerts += 1

    demo_alerts = session.exec(select(Alert)).all()
    deleted_demo_alerts = 0
    for alert in demo_alerts:
        if alert.features_json.get("demo_metrics") is True:
            session.delete(alert)
            deleted_demo_alerts += 1

    session.commit()
    return {
        "deleted_actions": len(demo_actions),
        "reset_alerts": reset_alerts,
        "deleted_risk_alerts": deleted_demo_alerts,
    }


def seed_actions(session: Session) -> dict[str, int]:
    plans = (
        ("convertida", 10, "Pedido confirmado tras contacto demo"),
        ("desestimada", 4, "Revisada como falso positivo demo"),
        ("en_curso", 12, "Cliente contactado por el equipo demo"),
    )
    total_needed = sum(count for _, count, _ in plans)
    alerts = session.exec(
        select(Alert)
        .where(Alert.estado == "nueva")
        .order_by(col(Alert.prioridad_score).desc())
        .limit(total_needed)
    ).all()

    created = {"convertida": 0, "desestimada": 0, "en_curso": 0}
    cursor = 0
    now = datetime.now(timezone.utc)

    for result, count, comment in plans:
        for alert in alerts[cursor : cursor + count]:
            action = Action(
                alert_id=alert.id,
                ejecutado_por="Demo",
                fecha=now,
                resultado=result,
                comentario=f"{DEMO_MARK}: {comment}",
            )
            alert.estado = result
            session.add(action)
            session.add(alert)
            created[result] += 1
        cursor += count

    session.commit()
    return created


def seed_risk_alerts(session: Session, count: int) -> int:
    clients = session.exec(
        select(Client)
        .where(Client.province.is_not(None))
        .order_by(col(Client.client_id).desc())
        .limit(count)
    ).all()
    now = datetime.now(timezone.utc)

    created = 0
    for idx, client in enumerate(clients, start=1):
        alert = Alert(
            fecha=now,
            client_id=client.client_id,
            subfamilia="Familia T1",
            tipo_dinamica="technical",
            tipologia_cliente="at_risk",
            motivo=(
                "Demo: deterioro sostenido de compras frente a su patrón histórico. "
                "Priorizar llamada de recuperación."
            ),
            urgencia_dias=min(idx, 7),
            prioridad_score=950.0 - idx,
            impacto_estimado=18000.0 - (idx * 750),
            canal_recomendado="rep",
            gestor_responsable="Delegado Comercial",
            plazo_dias=7,
            estado="nueva",
            features_json={
                "demo_metrics": True,
                "created_by": "scripts/demo_metrics.py",
                "scenario": "at_risk_client",
            },
        )
        session.add(alert)
        created += 1

    session.commit()
    return created


def seed_demo(session: Session, risk_clients: int) -> dict[str, int]:
    reset_demo(session)
    actions = seed_actions(session)
    risk_alerts = seed_risk_alerts(session, risk_clients)
    return {
        "converted": actions["convertida"],
        "false_positive": actions["desestimada"],
        "in_progress": actions["en_curso"],
        "risk_alerts": risk_alerts,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed/reset demo metrics for Pulse.")
    parser.add_argument("command", choices=["seed", "reset"], help="Action to run")
    parser.add_argument("--risk-clients", type=int, default=5, help="At-risk demo alerts to create")
    args = parser.parse_args()

    with Session(get_engine()) as session:
        if args.command == "reset":
            result = reset_demo(session)
        else:
            result = seed_demo(session, risk_clients=args.risk_clients)

    print("Demo metrics updated:")
    for key, value in result.items():
        print(f"- {key}: {value}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

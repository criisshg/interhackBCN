"""Tool definitions + implementations for Gemini function calling.

El agente llama estas funciones a través del SDK `google-genai`. Cada tool
hace HTTP requests a la propia API (endpoints de P2 · Big Yahu) usando
httpx — desacoplado de la BD y consistente con la "capa de activación"
del briefing v3.

Variables de entorno:
    API_BASE_URL  · opcional. Si no está, se usa RENDER_EXTERNAL_URL o localhost:$PORT.
"""
from __future__ import annotations

import os
from datetime import date, datetime
from typing import Any

import httpx

TIMEOUT = 10.0

SUBFAMILY_LABELS = {
    "C1": "anestésicos",
    "C2": "bioseguridad",
    "T1": "restauración",
    "T2": "cirugía",
}


def _api_base_url() -> str:
    configured = os.environ.get("API_BASE_URL")
    if configured:
        return configured.rstrip("/")

    render_url = os.environ.get("RENDER_EXTERNAL_URL")
    if render_url:
        return render_url.rstrip("/")

    port = os.environ.get("PORT", "8000")
    return f"http://127.0.0.1:{port}"


# === Declaraciones (JSON Schema) que ve Gemini ===

TOOL_DECLARATIONS = [
    {
        "name": "get_alerts",
        "description": (
            "Devuelve alertas comerciales filtradas. Útil cuando el usuario pide listas o resumen "
            "(p.ej. 'top 10 en Cataluña', 'alertas de fuga esta semana', 'alertas commodity de Madrid'). "
            "Devuelve `items` con cada alerta incluyendo motivo, urgencia, prioridad e impacto."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "tipo": {
                    "type": "string",
                    "enum": ["commodity", "technical"],
                    "description": "Tipo de dinámica de la alerta.",
                },
                "tipologia": {
                    "type": "string",
                    "enum": ["loyal", "promiscuous", "at_risk", "marginal"],
                    "description": "Tipología del cliente respecto a la subfamilia.",
                },
                "provincia": {"type": "string", "description": "Provincia del cliente (España)."},
                "subfamilia": {"type": "string", "description": "Subfamilia de producto."},
                "limit": {"type": "integer", "description": "Número máximo de resultados (1-100)."},
            },
        },
    },
    {
        "name": "get_client",
        "description": (
            "Devuelve el perfil completo de un cliente: ubicación, segmento, delegado, timeline de "
            "compras recientes (hasta 200) y alertas activas. Úsalo cuando el usuario pregunta por un "
            "cliente concreto."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer", "description": "ID numérico del cliente."},
            },
            "required": ["client_id"],
        },
    },
    {
        "name": "explain_alert",
        "description": (
            "Devuelve los detalles completos de una alerta concreta: motivo, features que la "
            "activaron (features_json) y snapshot del cliente. Úsalo cuando el usuario pide explicar "
            "POR QUÉ se generó una alerta."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "alert_id": {"type": "integer", "description": "ID numérico de la alerta."},
            },
            "required": ["alert_id"],
        },
    },
    {
        "name": "draft_outreach",
        "description": (
            "Devuelve el contexto necesario (cliente + alertas activas + compras recientes) para "
            "redactar un email o guion comercial. Tras llamar esta tool, redacta tú mismo el email "
            "en español usando los datos devueltos. Intent posibles: 'captura' (cliente promiscuo), "
            "'reposicion' (cliente leal), 'recuperacion' (riesgo de fuga)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer", "description": "ID del cliente al que dirigirse."},
                "intent": {
                    "type": "string",
                    "enum": ["captura", "reposicion", "recuperacion"],
                    "description": "Intención comercial del contacto.",
                },
            },
            "required": ["client_id", "intent"],
        },
    },
]


# === Helper HTTP ===


def _get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """GET contra la API. Devuelve dict con `error` si falla, en lugar de excepcionar.

    Esto permite que Gemini reciba el error como respuesta de la tool y lo comunique
    al usuario de forma natural, sin romper el loop de tool-use.
    """
    api_base_url = _api_base_url()
    url = f"{api_base_url}{path}"
    try:
        r = httpx.get(url, params=params, timeout=TIMEOUT)
        r.raise_for_status()
        return r.json()
    except httpx.HTTPStatusError as e:
        return {
            "error": f"API returned {e.response.status_code}",
            "path": path,
            "detail": e.response.text[:500],
        }
    except httpx.RequestError as e:
        return {"error": f"cannot reach API at {api_base_url}", "exception": str(e)}


# === Implementaciones ===


def get_alerts(**filters: Any) -> dict[str, Any]:
    """GET /alerts con filtros opcionales."""
    params: dict[str, Any] = {k: v for k, v in filters.items() if v is not None and v != ""}
    params.setdefault("limit", 10)
    return _get("/alerts", params)


def get_client(client_id: int) -> dict[str, Any]:
    """GET /clients/{id} — incluye timeline y alertas activas."""
    return _get(f"/clients/{client_id}")


def explain_alert(alert_id: int) -> dict[str, Any]:
    """GET /alerts/{id} — incluye features_json y snapshot del cliente."""
    return _get(f"/alerts/{alert_id}")


def _parse_date(value: Any) -> date | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _fmt_eur(value: Any) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "sin dato"
    if number <= 0:
        return "sin dato"
    if number >= 100:
        return f"{number:,.0f}€".replace(",", ".")
    return f"{number:,.2f}€".replace(",", "X").replace(".", ",").replace("X", ".")


def _fmt_date_es(value: date | None) -> str:
    if value is None:
        return "sin fecha"
    return f"{value.day}/{value.month}/{value.year}"


def _suggested_email(client: dict[str, Any], intent: str) -> str:
    client_id = client.get("client_id") or client.get("id") or "sin ID"
    alerts = client.get("alerts") or []
    purchases = client.get("timeline") or []
    alert = alerts[0] if alerts else {}
    last_purchase = purchases[0] if purchases else {}

    subfamily = (
        alert.get("subfamilia")
        or alert.get("subfamily")
        or last_purchase.get("subfamilia")
        or last_purchase.get("subfamily")
        or last_purchase.get("category")
        or "la subfamilia"
    )
    subfamily_text = SUBFAMILY_LABELS.get(str(subfamily), str(subfamily))
    last_date = _parse_date(last_purchase.get("fecha") or last_purchase.get("date"))
    days_since = (date.today() - last_date).days if last_date else None
    value = _fmt_eur(last_purchase.get("valor") or last_purchase.get("value"))
    province = client.get("province") or client.get("provincia") or "tu zona"

    if intent == "reposicion":
        subject = f"Próxima reposición de {subfamily_text}"
        context = (
            f"Queremos anticipar la próxima reposición en {subfamily_text} para evitar roturas de stock."
        )
    elif intent == "captura":
        subject = f"Oportunidad en {subfamily_text} con Inibsa"
        context = (
            f"Vemos una oportunidad para acompañarte mejor en {subfamily_text} y ajustar la propuesta a tu volumen real."
        )
    else:
        subject = f"Recuperar la reposición de {subfamily_text}"
        context = (
            f"Queremos entender si sigues trabajando {subfamily_text} y cómo podemos recuperar la reposición con Inibsa."
        )

    if days_since is not None:
        opening = (
            f"Hace {days_since} días que no registramos un pedido de {subfamily_text} "
            f"para el cliente {client_id}; el último fue el {_fmt_date_es(last_date)} por {value}."
        )
    else:
        opening = (
            f"No tengo una última compra fechada para el cliente {client_id}, pero sí una señal activa "
            f"relacionada con {subfamily_text}."
        )

    if alert.get("motivo"):
        context = f"La alerta activa indica: {alert['motivo']}"

    return "\n".join(
        [
            f"**Asunto:** {subject}",
            "",
            "Hola [Nombre],",
            "",
            opening,
            context,
            f"Te propongo una llamada breve para revisar necesidades actuales en {province} y acordar el siguiente pedido.",
            "¿Te llamo el jueves a las 11:00?",
            "",
            "Un saludo,",
            "Delegado de Inibsa",
        ]
    )


def draft_outreach(client_id: int, intent: str) -> dict[str, Any]:
    """Devuelve contexto para que Gemini redacte el email."""
    client = get_client(client_id)
    if "error" in client:
        return client

    return {
        "client_id": client.get("client_id"),
        "province": client.get("province"),
        "clinic_segment": client.get("clinic_segment"),
        "delegado_inferido": client.get("delegado_inferido"),
        "active_alerts": client.get("alerts", []),
        "recent_purchases": (client.get("timeline") or [])[:5],
        "intent": intent,
        "suggested_email": _suggested_email(client, intent),
        "instructions": (
            f"Usa `suggested_email` como respuesta base y no añadas introducción. "
            f"Redacta un email comercial breve (3-5 frases) en español. "
            f"Intent: {intent}. Tono: profesional, directo, orientado a la acción. "
            f"Cita el client_id y la subfamilia más relevante. "
            f"Si intent='recuperacion' usa tono empático ('hemos echado en falta...'); "
            f"si intent='captura' usa tono de oportunidad ('queremos acompañarte mejor en...'); "
            f"si intent='reposicion' usa tono de servicio ('te recordamos que tu próximo pedido...'). "
            f"Recuerda que NO observamos compras a competencia: la actividad de competencia se "
            f"infiere del gap entre potencial y compras Inibsa."
        ),
    }


TOOL_FUNCTIONS = {
    "get_alerts": get_alerts,
    "get_client": get_client,
    "explain_alert": explain_alert,
    "draft_outreach": draft_outreach,
}

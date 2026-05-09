"""Tool definitions + implementations for Gemini function calling.

El agente llama estas funciones a través del SDK `google-genai`. Cada tool
hace HTTP requests a la propia API (endpoints de P2 · Big Yahu) usando
httpx — desacoplado de la BD y consistente con la "capa de activación"
del briefing v3.

Variables de entorno:
    API_BASE_URL  · default http://localhost:8000
"""
from __future__ import annotations

import os
from typing import Any

import httpx

API_BASE_URL = os.environ.get("API_BASE_URL", "http://localhost:8000").rstrip("/")
TIMEOUT = 10.0


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
    url = f"{API_BASE_URL}{path}"
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
        return {"error": f"cannot reach API at {API_BASE_URL}", "exception": str(e)}


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
        "instructions": (
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

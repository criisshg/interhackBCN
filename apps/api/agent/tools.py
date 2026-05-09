"""Tool definitions for Gemini function calling.

Las firmas son estables; los bodies (lo que las tools devuelven) los implementa P4
delegando a la BD vía SQLModel o llamando a los routers de P2.

Formato Gemini: lista de dicts con `name`, `description`, `parameters` (JSON Schema).
El SDK `google-genai` los acepta tal cual o vía `types.FunctionDeclaration`.
"""
from __future__ import annotations

# Definiciones (JSON Schema) — usadas tanto por el SDK como por documentación.
TOOL_DECLARATIONS = [
    {
        "name": "get_alerts",
        "description": (
            "Devuelve alertas filtradas. Útil cuando el usuario pide listas o resumen "
            "(p.ej. 'top 10 en Cataluña', 'alertas de fuga esta semana')."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "tipo": {"type": "string", "enum": ["commodity", "technical"]},
                "tipologia": {
                    "type": "string",
                    "enum": ["loyal", "promiscuous", "at_risk", "marginal"],
                },
                "provincia": {"type": "string"},
                "subfamilia": {"type": "string"},
                "limit": {"type": "integer"},
            },
        },
    },
    {
        "name": "get_client",
        "description": "Perfil de un cliente, timeline de compras y alertas activas.",
        "parameters": {
            "type": "object",
            "properties": {"client_id": {"type": "integer"}},
            "required": ["client_id"],
        },
    },
    {
        "name": "explain_alert",
        "description": (
            "Explica en lenguaje natural por qué se generó una alerta, citando los "
            "features que la activaron y la tipología del cliente."
        ),
        "parameters": {
            "type": "object",
            "properties": {"alert_id": {"type": "integer"}},
            "required": ["alert_id"],
        },
    },
    {
        "name": "draft_outreach",
        "description": (
            "Redacta un email o guion de llamada para el comercial, basado en el cliente "
            "y la intención (captura, reposición, recuperación)."
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "client_id": {"type": "integer"},
                "intent": {
                    "type": "string",
                    "enum": ["captura", "reposicion", "recuperacion"],
                },
            },
            "required": ["client_id", "intent"],
        },
    },
]


# === Implementaciones (P4: rellenar con queries reales) ===


def get_alerts(**filters) -> dict:
    """P4: query a /alerts via httpx o directamente a Postgres."""
    raise NotImplementedError


def get_client(client_id: int) -> dict:
    raise NotImplementedError


def explain_alert(alert_id: int) -> dict:
    raise NotImplementedError


def draft_outreach(client_id: int, intent: str) -> dict:
    raise NotImplementedError


TOOL_FUNCTIONS = {
    "get_alerts": get_alerts,
    "get_client": get_client,
    "explain_alert": explain_alert,
    "draft_outreach": draft_outreach,
}

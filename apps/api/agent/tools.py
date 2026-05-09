"""Tool definitions for Claude tool-use. P4 implements bodies; signatures stable."""

TOOLS = [
    {
        "name": "get_alerts",
        "description": (
            "Devuelve alertas filtradas. Útil cuando el usuario pide listas o resumen "
            "(p.ej. 'top 10 en Cataluña', 'alertas de fuga esta semana')."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "tipo": {"type": "string", "enum": ["commodity", "technical"]},
                "tipologia": {
                    "type": "string",
                    "enum": ["loyal", "promiscuous", "at_risk", "marginal"],
                },
                "provincia": {"type": "string"},
                "subfamilia": {"type": "string"},
                "limit": {"type": "integer", "default": 10},
            },
        },
    },
    {
        "name": "get_client",
        "description": "Perfil de un cliente, timeline de compras y alertas activas.",
        "input_schema": {
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
        "input_schema": {
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
        "input_schema": {
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

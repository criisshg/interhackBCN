"""Tool definitions for Gemini function calling. P4 implements bodies; signatures stable."""

import google.generativeai as genai

TOOLS = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name="get_alerts",
                description=(
                    "Devuelve alertas filtradas. Útil cuando el usuario pide listas o resumen "
                    "(p.ej. 'top 10 en Cataluña', 'alertas de fuga esta semana')."
                ),
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "tipo": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            enum=["commodity", "technical"],
                        ),
                        "tipologia": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            enum=["loyal", "promiscuous", "at_risk", "marginal"],
                        ),
                        "provincia": genai.protos.Schema(type=genai.protos.Type.STRING),
                        "subfamilia": genai.protos.Schema(type=genai.protos.Type.STRING),
                        "limit": genai.protos.Schema(type=genai.protos.Type.INTEGER),
                    },
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="get_client",
                description="Perfil de un cliente, timeline de compras y alertas activas.",
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "client_id": genai.protos.Schema(type=genai.protos.Type.INTEGER),
                    },
                    required=["client_id"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="explain_alert",
                description=(
                    "Explica en lenguaje natural por qué se generó una alerta, citando los "
                    "features que la activaron y la tipología del cliente."
                ),
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "alert_id": genai.protos.Schema(type=genai.protos.Type.INTEGER),
                    },
                    required=["alert_id"],
                ),
            ),
            genai.protos.FunctionDeclaration(
                name="draft_outreach",
                description=(
                    "Redacta un email o guion de llamada para el comercial, basado en el cliente "
                    "y la intención (captura, reposición, recuperación)."
                ),
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        "client_id": genai.protos.Schema(type=genai.protos.Type.INTEGER),
                        "intent": genai.protos.Schema(
                            type=genai.protos.Type.STRING,
                            enum=["captura", "reposicion", "recuperacion"],
                        ),
                    },
                    required=["client_id", "intent"],
                ),
            ),
        ]
    )
]

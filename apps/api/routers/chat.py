"""Chat endpoint con Gemini · function calling.

P4 (Nig) implementa el loop de tool-use real. Este es un esqueleto funcional
listo para conectar al SDK `google-genai`.
"""
from __future__ import annotations

import os
import re
import unicodedata
from collections.abc import Callable
from typing import Any, cast

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel

from agent.system_prompt import SYSTEM_PROMPT
from agent.tools import TOOL_DECLARATIONS, TOOL_FUNCTIONS

router = APIRouter()

MODEL = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")


class ChatIn(BaseModel):
    messages: list[dict]  # [{"role": "user"|"model", "content": "..."}]


def _client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY not set")
    return genai.Client(api_key=api_key)


def _to_gemini_contents(messages: list[dict]) -> list[types.Content]:
    """Convierte el formato simple del frontend al formato types.Content de Gemini."""
    return [
        types.Content(
            role="user" if m["role"] == "user" else "model",
            parts=[types.Part(text=m["content"])],
        )
        for m in messages
    ]


def _clean_response(text: str) -> str:
    """Pequeño pulido defensivo para mantener el chat escaneable."""
    cleaned = text.strip()
    cleaned = re.sub(r"^(claro|por supuesto|aquí tienes)[,:\s]+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+(\*Nota:)", r"\n\n\1", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _latest_user_text(messages: list[dict]) -> str:
    for message in reversed(messages):
        if message.get("role") == "user":
            return str(message.get("content") or "")
    return ""


def _normalize(text: str) -> str:
    normalized = unicodedata.normalize("NFKD", text.lower())
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _extract_limit(text: str, default: int = 5) -> int:
    match = re.search(r"\b(\d{1,2})\b", text)
    if not match:
        return default
    return min(max(int(match.group(1)), 1), 10)


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0.0


def _fmt_eur(value: Any) -> str:
    number = _number(value)
    return f"{number:,.0f}€".replace(",", ".")


def _direct_chart_response(user_text: str) -> dict[str, Any] | None:
    """Fallback determinista: crea gráficas pedidas explícitamente sin depender de Gemini."""
    q = _normalize(user_text)
    chart_words = (
        "grafico",
        "grafic",
        "chart",
        "visualizacion",
        "visualitzacio",
        "barra",
        "bar",
        "pie",
        "linea",
        "evolucion",
        "distribucion",
    )
    if not any(word in q for word in chart_words):
        return None

    if "alerta" in q and any(word in q for word in ("impacto", "ranking", "top", "barra", "bar")):
        limit = _extract_limit(q)
        get_alerts = cast(Callable[..., dict[str, Any]], TOOL_FUNCTIONS["get_alerts"])
        result = get_alerts(limit=100)
        items = result.get("items") if isinstance(result, dict) else None
        if not isinstance(items, list) or not items:
            return {
                "role": "assistant",
                "content": "No he podido recuperar alertas para construir la gráfica.",
                "charts": [],
            }

        top = sorted(items, key=lambda item: _number(item.get("impacto_estimado")), reverse=True)[:limit]
        data = [
            {
                "alerta": f"#{item.get('id')}",
                "impacto": round(_number(item.get("impacto_estimado")), 2),
            }
            for item in top
        ]
        chart = {
            "chart_type": "bar",
            "data": data,
            "x_key": "alerta",
            "y_key": "impacto",
            "title": f"Top {len(data)} alertas por impacto estimado",
            "caption": "Impacto estimado en euros, calculado desde las alertas activas.",
        }
        leader = top[0]
        content = (
            f"La alerta con mayor impacto es **#{leader.get('id')}**, cliente "
            f"**{leader.get('client_id')}**, con impacto estimado de "
            f"**{_fmt_eur(leader.get('impacto_estimado'))}**."
        )
        return {"role": "assistant", "content": content, "charts": [chart]}

    if "alerta" in q and any(word in q for word in ("tipologia", "canal", "tipo", "distribucion", "pie")):
        get_alerts = cast(Callable[..., dict[str, Any]], TOOL_FUNCTIONS["get_alerts"])
        result = get_alerts(limit=100)
        items = result.get("items") if isinstance(result, dict) else None
        if not isinstance(items, list) or not items:
            return {
                "role": "assistant",
                "content": "No he podido recuperar alertas para construir la gráfica.",
                "charts": [],
            }

        if "canal" in q:
            key, label = "canal_recomendado", "canal"
        elif "tipo" in q and "tipologia" not in q:
            key, label = "tipo_dinamica", "tipo"
        else:
            key, label = "tipologia_cliente", "tipología"

        counts: dict[str, int] = {}
        for item in items:
            name = str(item.get(key) or "sin dato")
            counts[name] = counts.get(name, 0) + 1

        data = [{"categoria": name, "alertas": count} for name, count in sorted(counts.items(), key=lambda kv: kv[1], reverse=True)]
        chart = {
            "chart_type": "pie",
            "data": data[:6],
            "x_key": "categoria",
            "y_key": "alertas",
            "title": f"Distribución de alertas por {label}",
            "caption": "Muestra hasta 100 alertas recuperadas de la API.",
        }
        content = f"La categoría dominante es **{data[0]['categoria']}**, con **{data[0]['alertas']} alertas** en la muestra."
        return {"role": "assistant", "content": content, "charts": [chart]}

    if any(word in q for word in ("evolucion", "linea", "line", "compras")) and "cliente" in q:
        id_match = re.search(r"\b(\d{5,})\b", q)
        if not id_match:
            return {
                "role": "assistant",
                "content": "Dime el ID del cliente para poder pintar la evolución de compras.",
                "charts": [],
            }
        client_id = int(id_match.group(1))
        get_client = cast(Callable[..., dict[str, Any]], TOOL_FUNCTIONS["get_client"])
        result = get_client(client_id=client_id)
        timeline = result.get("timeline") if isinstance(result, dict) else None
        if not isinstance(timeline, list) or len(timeline) <= 3:
            return {
                "role": "assistant",
                "content": f"No tengo suficientes compras del cliente **{client_id}** para pintar una evolución útil.",
                "charts": [],
            }

        monthly: dict[str, float] = {}
        for row in timeline:
            raw_date = str(row.get("fecha") or row.get("date") or "")
            month = raw_date[:7]
            if len(month) != 7:
                continue
            monthly[month] = monthly.get(month, 0.0) + _number(row.get("valor") or row.get("value"))

        data = [{"mes": month, "ventas": round(value, 2)} for month, value in sorted(monthly.items())[-8:]]
        if len(data) <= 3:
            return {
                "role": "assistant",
                "content": f"No tengo suficientes meses del cliente **{client_id}** para pintar una línea útil.",
                "charts": [],
            }
        chart = {
            "chart_type": "line",
            "data": data,
            "x_key": "mes",
            "y_key": "ventas",
            "title": f"Evolución de compras del cliente {client_id}",
            "caption": "Ventas mensuales agrupadas desde el timeline del cliente.",
        }
        content = f"La evolución muestra **{len(data)} meses** con compras registradas para el cliente **{client_id}**."
        return {"role": "assistant", "content": content, "charts": [chart]}

    return None


@router.post("")
def chat(payload: ChatIn) -> dict:
    direct_chart = _direct_chart_response(_latest_user_text(payload.messages))
    if direct_chart is not None:
        return direct_chart

    client = _client()
    contents = _to_gemini_contents(payload.messages)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        temperature=0.2,
        tools=[types.Tool(function_declarations=TOOL_DECLARATIONS)],  # type: ignore[arg-type]
    )

    last_draft: dict[str, Any] | None = None
    charts: list[dict[str, Any]] = []
    text_chunks: list[str] = []

    # Loop de tool-use: si Gemini pide una tool, la ejecutamos y devolvemos el resultado.
    for _ in range(8):  # max 8 iteraciones para evitar bucles infinitos
        response = client.models.generate_content(
            model=MODEL, contents=contents, config=config
        )

        if response.text:
            text_chunks.append(response.text)

        function_calls = response.function_calls or []
        if not function_calls:
            if last_draft and last_draft.get("suggested_email"):
                content = str(last_draft["suggested_email"])
            else:
                content = "\n\n".join(text_chunks).strip()
            if not content and charts:
                content = f"Aquí tienes la gráfica: **{charts[0].get('title', 'visualización')}**."
            return {"role": "assistant", "content": _clean_response(content), "charts": charts}

        # Añadir la respuesta del modelo (con function_call) a la conversación
        candidates = response.candidates or []
        if not candidates or candidates[0].content is None:
            raise HTTPException(status_code=500, detail="Gemini response missing candidate content")
        contents.append(candidates[0].content)

        # Ejecutar cada tool y devolver el resultado
        for call in function_calls:
            name = call.name or ""
            fn = cast(Callable[..., dict[str, Any]] | None, TOOL_FUNCTIONS.get(name))
            if fn is None:
                result = {"error": f"unknown tool: {name}"}
            else:
                try:
                    result = fn(**(call.args or {}))
                    if name == "draft_outreach":
                        last_draft = result
                    if name == "make_chart" and isinstance(result, dict) and result.get("ok"):
                        chart_spec = result.get("chart")
                        if isinstance(chart_spec, dict):
                            charts.append(chart_spec)
                except NotImplementedError:
                    result = {"error": f"tool {name} not yet implemented"}
                except Exception as e:  # noqa: BLE001 — surface to model
                    result = {"error": str(e)}

            contents.append(
                types.Content(
                    role="user",
                    parts=[
                        types.Part.from_function_response(name=name, response=result)
                    ],
                )
            )

    raise HTTPException(status_code=500, detail="Tool-use loop exceeded max iterations")

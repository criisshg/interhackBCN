"""Chat endpoint con Gemini · function calling.

P4 (Nig) implementa el loop de tool-use real. Este es un esqueleto funcional
listo para conectar al SDK `google-genai`.
"""
from __future__ import annotations

import os
import re
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


@router.post("")
def chat(payload: ChatIn) -> dict:
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

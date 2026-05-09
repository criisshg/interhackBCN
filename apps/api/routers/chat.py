"""Chat endpoint con Gemini · function calling.

P4 (Nig) implementa el loop de tool-use real. Este es un esqueleto funcional
listo para conectar al SDK `google-genai`.
"""
from __future__ import annotations

import os
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


@router.post("")
def chat(payload: ChatIn) -> dict:
    client = _client()
    contents = _to_gemini_contents(payload.messages)

    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        tools=[types.Tool(function_declarations=TOOL_DECLARATIONS)],  # type: ignore[arg-type]
    )

    # Loop de tool-use: si Gemini pide una tool, la ejecutamos y devolvemos el resultado.
    for _ in range(8):  # max 8 iteraciones para evitar bucles infinitos
        response = client.models.generate_content(
            model=MODEL, contents=contents, config=config
        )

        function_calls = response.function_calls or []
        if not function_calls:
            return {"role": "assistant", "content": response.text or ""}

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

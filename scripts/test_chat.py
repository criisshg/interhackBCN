"""End-to-end test del chat endpoint · agente con tool-use real.

Lanza una serie de preguntas tipo contra POST /chat y muestra la respuesta
del agente. Útil para validar que las 4 tools funcionan contra los
endpoints de la API real.

Prerrequisitos antes de correr este script:
    1. Postgres levantado y poblado (`make seed`)
    2. API arrancada en http://localhost:8000 (`make api`)
    3. .env con GEMINI_API_KEY válida y API_BASE_URL configurado

Uso (desde la raíz del proyecto):
    python scripts/test_chat.py                 # corre todos los casos
    python scripts/test_chat.py "tu pregunta"   # pregunta puntual
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

CHAT_URL = "http://localhost:8000/chat"
TIMEOUT = 60.0  # tool-use con 8 iteraciones puede tardar

DEMO_QUESTIONS = [
    "¿Cuántas alertas activas hay en total? Dime las 3 más urgentes.",
    "Dame 5 alertas de tipo commodity en Cataluña.",
    "Explícame por qué se generó la alerta con id 1.",
    "Dame el perfil del cliente 100.",
    "Redáctame un email para reactivar al cliente 100 con intent recuperacion.",
]


def ask(question: str) -> dict:
    payload = {"messages": [{"role": "user", "content": question}]}
    r = httpx.post(CHAT_URL, json=payload, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def main() -> int:
    # Sanity check: la API responde?
    try:
        h = httpx.get("http://localhost:8000/health", timeout=5.0)
        h.raise_for_status()
    except Exception as e:
        print(f"ERROR: la API no responde en http://localhost:8000")
        print(f"  Asegúrate de haber corrido `make api` o `cd apps/api && uvicorn main:app --reload`")
        print(f"  Detalle: {e}")
        return 1

    print(f"API OK ({h.json()})")
    print(f"Usando endpoint: {CHAT_URL}\n")

    questions = [sys.argv[1]] if len(sys.argv) > 1 else DEMO_QUESTIONS

    for i, q in enumerate(questions, 1):
        print(f"\n{'=' * 70}")
        print(f"[{i}/{len(questions)}] PREGUNTA: {q}")
        print("-" * 70)
        try:
            response = ask(q)
            content = response.get("content", "")
            print(f"RESPUESTA:\n{content}\n")
        except httpx.HTTPStatusError as e:
            print(f"HTTP ERROR {e.response.status_code}: {e.response.text[:500]}")
        except Exception as e:  # noqa: BLE001
            print(f"ERROR: {e}")

    print(f"\n{'=' * 70}")
    print("Tests terminados.")
    return 0


if __name__ == "__main__":
    sys.exit(main())

"""REPL interactivo contra POST /chat · ideal para iterar el system prompt.

Mantiene historial de la conversación entre turnos. Salida con Ctrl+C o `salir`.

Uso (con la API corriendo en localhost:8000):
    python scripts/chat_repl.py
"""
from __future__ import annotations

import sys

import httpx

CHAT_URL = "http://localhost:8000/chat"
TIMEOUT = 60.0


def main() -> int:
    try:
        h = httpx.get("http://localhost:8000/health", timeout=5.0)
        h.raise_for_status()
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: la API no responde en http://localhost:8000  ({e})")
        print("       Lanza `make api` en otra terminal y vuelve a intentarlo.")
        return 1

    print("Pulse · chat REPL")
    print("Escribe tu pregunta. Comandos: `salir` (Ctrl+C también) · `reset` (borra historial).")
    print("-" * 60)

    history: list[dict] = []

    while True:
        try:
            user_input = input("\n[Tú] ").strip()
        except (KeyboardInterrupt, EOFError):
            print("\nHasta luego.")
            return 0

        if not user_input:
            continue
        if user_input.lower() in {"salir", "exit", "quit"}:
            return 0
        if user_input.lower() == "reset":
            history = []
            print("Historial borrado.")
            continue

        history.append({"role": "user", "content": user_input})
        try:
            r = httpx.post(CHAT_URL, json={"messages": history}, timeout=TIMEOUT)
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPStatusError as e:
            print(f"\n[ERROR HTTP {e.response.status_code}] {e.response.text[:500]}")
            history.pop()  # no metemos el turno fallido en el historial
            continue
        except Exception as e:  # noqa: BLE001
            print(f"\n[ERROR] {e}")
            history.pop()
            continue

        content = data.get("content", "")
        print(f"\n[Pulse] {content}")
        history.append({"role": "model", "content": content})


if __name__ == "__main__":
    sys.exit(main())

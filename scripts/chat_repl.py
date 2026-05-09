"""REPL interactivo contra POST /chat · ideal para iterar el system prompt.

Mantiene historial de la conversación entre turnos. Salida con Ctrl+C o `salir`.

Comandos dentro del REPL:
    salir / exit / quit  → cerrar
    reset                → borra el historial
    voz                  → toggle modo voz (genera + reproduce audio cada turno)
    voz on / voz off     → fuerza estado del modo voz

Uso (con la API corriendo en localhost:8000):
    python scripts/chat_repl.py
    python scripts/chat_repl.py --voice    # arranca con voz activada
"""
from __future__ import annotations

import os
import re
import sys
from pathlib import Path

import httpx

CHAT_URL = "http://localhost:8000/chat"
VOICE_URL = "http://localhost:8000/voice"
TIMEOUT = 60.0
AUDIO_FILE = Path(__file__).resolve().parent.parent / "reply.mp3"


def clean_for_tts(text: str) -> str:
    """Quita markdown que sonaría fatal en TTS (tablas, asteriscos, bullets, etc.)."""
    # Tablas: líneas que empiezan por `|` o son separadores `|---|`
    lines = []
    for line in text.split("\n"):
        s = line.strip()
        if s.startswith("|"):
            continue
        if re.fullmatch(r"[\s\-:|]+", s) and len(s) >= 3:
            continue
        lines.append(line)
    text = "\n".join(lines)

    # Headers `#`, blockquotes `>`
    text = re.sub(r"^#+\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    # **bold** y *cursiva* → conservar contenido
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"(?<!\w)\*(.+?)\*(?!\w)", r"\1", text)
    text = re.sub(r"__(.+?)__", r"\1", text)
    text = re.sub(r"(?<!\w)_(.+?)_(?!\w)", r"\1", text)
    # `inline code`
    text = re.sub(r"`([^`]+)`", r"\1", text)
    # Links markdown [text](url) → text
    text = re.sub(r"\[([^\]]+)\]\([^\)]+\)", r"\1", text)
    # Prefijos de bullets `- `, `* `, `• `
    text = re.sub(r"^\s*[\-\*•]\s+", "", text, flags=re.MULTILINE)
    # Whitespace
    text = re.sub(r" {2,}", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def speak(text: str) -> None:
    """Pide TTS al endpoint /voice y abre el reproductor."""
    cleaned = clean_for_tts(text)
    if not cleaned:
        print("[voz] respuesta vacía tras limpiar markdown, no hay nada que decir.")
        return
    try:
        with httpx.stream("POST", VOICE_URL, json={"text": cleaned}, timeout=TIMEOUT) as r:
            r.raise_for_status()
            with AUDIO_FILE.open("wb") as f:
                for chunk in r.iter_bytes():
                    f.write(chunk)
    except httpx.HTTPStatusError as e:
        print(f"[voz · ERROR HTTP {e.response.status_code}] {e.response.text[:300]}")
        return
    except Exception as e:  # noqa: BLE001
        print(f"[voz · ERROR] {e}")
        return

    try:
        os.startfile(str(AUDIO_FILE))  # type: ignore[attr-defined]  # Windows
    except AttributeError:
        # Linux/Mac fallback
        import subprocess

        opener = "open" if sys.platform == "darwin" else "xdg-open"
        subprocess.Popen([opener, str(AUDIO_FILE)])


def main() -> int:
    voice_mode = "--voice" in sys.argv or "-v" in sys.argv

    try:
        h = httpx.get("http://localhost:8000/health", timeout=5.0)
        h.raise_for_status()
    except Exception as e:  # noqa: BLE001
        print(f"ERROR: la API no responde en http://localhost:8000  ({e})")
        print("       Lanza `make api` en otra terminal y vuelve a intentarlo.")
        return 1

    print("Pulse · chat REPL")
    print("Comandos: `salir` · `reset` · `voz` (toggle) · `voz on` / `voz off`")
    print(f"Modo voz: {'ON' if voice_mode else 'OFF'}")
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

        cmd = user_input.lower()
        if cmd in {"salir", "exit", "quit"}:
            return 0
        if cmd == "reset":
            history = []
            print("Historial borrado.")
            continue
        if cmd == "voz":
            voice_mode = not voice_mode
            print(f"Modo voz: {'ON' if voice_mode else 'OFF'}")
            continue
        if cmd in {"voz on", "voz si", "voz sí"}:
            voice_mode = True
            print("Modo voz: ON")
            continue
        if cmd == "voz off":
            voice_mode = False
            print("Modo voz: OFF")
            continue

        history.append({"role": "user", "content": user_input})
        try:
            r = httpx.post(CHAT_URL, json={"messages": history}, timeout=TIMEOUT)
            r.raise_for_status()
            data = r.json()
        except httpx.HTTPStatusError as e:
            print(f"\n[ERROR HTTP {e.response.status_code}] {e.response.text[:500]}")
            history.pop()
            continue
        except Exception as e:  # noqa: BLE001
            print(f"\n[ERROR] {e}")
            history.pop()
            continue

        content = data.get("content", "")
        print(f"\n[Pulse] {content}")
        history.append({"role": "model", "content": content})

        if voice_mode and content:
            speak(content)


if __name__ == "__main__":
    sys.exit(main())

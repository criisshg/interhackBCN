"""Smoke test · verifica que la key de Gemini funciona.

Uso (desde la raíz del proyecto):
    python scripts/test_gemini.py

Lee GEMINI_API_KEY y GEMINI_MODEL desde el .env de la raíz.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

api_key = os.environ.get("GEMINI_API_KEY")
model = os.environ.get("GEMINI_MODEL", "gemini-2.5-flash")

if not api_key or api_key == "your-gemini-key-here":
    print("ERROR: GEMINI_API_KEY no configurada en .env")
    sys.exit(1)

print(f"Modelo: {model}")
print("Llamando a Gemini...")

client = genai.Client(api_key=api_key)
resp = client.models.generate_content(
    model=model,
    contents="Responde en una frase: ¿qué hace el agente Pulse de Inibsa?",
)

print("\n--- Respuesta ---")
print(resp.text)
print("\nOK — Gemini responde. Tu setup del agente funciona.")

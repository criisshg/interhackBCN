.PHONY: setup dev seed check deploy api web ml install recalc test-chat chat-repl

# === Setup ===
# Quick setup para todo el equipo. Detecta SO automáticamente.
# Crea venv, instala Python deps, npm deps, y copia .env.example → .env
setup:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
else
	bash scripts/setup.sh
endif

# Alternativa manual (si setup.* falla por algún motivo):
install:
	pip install -r requirements.txt
	cd apps/web && npm install

# === Dev ===
dev:
	@echo "Starting API on :8000 and Web on :3000 (Ctrl+C to stop)"
	@(cd apps/api && uvicorn main:app --reload --port 8000 &) ; \
	 (cd apps/web && npm run dev)

api:
	cd apps/api && uvicorn main:app --reload --port 8000

web:
	cd apps/web && npm run dev

# === Data ===
seed:
	cd apps/ml && python -m etl

recalc:
	cd apps/ml && python -m run_signals

# === Quality ===

test-chat:
	python scripts/test_chat.py

chat-repl:
	python scripts/chat_repl.py

check:
	cd apps/api && ruff check . && mypy . && pytest -q
	cd apps/ml && ruff check . && mypy .
	cd apps/web && npm run lint && npm run build

# === Deploy ===
deploy:
	git push origin main
	@echo "CI deploys to Vercel (web) automatically. DB hosted on Supabase."

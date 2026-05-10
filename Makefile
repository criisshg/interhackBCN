.PHONY: help setup install dev api web bootstrap \
        db-up db-start db-stop db-reset db-logs db-check \
        migrate seed recalc \
        test-gemini test-chat chat-repl demo-metrics reset-demo-metrics check deploy

# === Help ===
help:
	@echo ""
	@echo "  Pulse · comandos disponibles"
	@echo "  ---------------------------------------------"
	@echo "  Setup (1 vez):"
	@echo "    make setup        Instala deps Python + Node + .env desde plantillas"
	@echo "    make bootstrap    Levanta Postgres + migraciones + carga CSVs (todo en uno)"
	@echo ""
	@echo "  Dia a dia:"
	@echo "    make api          Levanta solo la API (puerto 8000)"
	@echo "    make web          Levanta solo el frontend (puerto 3000)"
	@echo "    make dev          Levanta API + Web a la vez"
	@echo "    make recalc       Regenera alertas sin recargar CSVs"
	@echo ""
	@echo "  Base de datos (Postgres en Docker):"
	@echo "    make db-up        Crea contenedor pulse-pg (primera vez)"
	@echo "    make db-start     Arranca contenedor existente"
	@echo "    make db-stop      Para sin destruir datos"
	@echo "    make db-reset     Borra y recrea (reset total)"
	@echo "    make db-logs      Muestra logs del contenedor"
	@echo "    make db-check     Imprime numero de filas en alerts"
	@echo "    make migrate      Aplica migraciones Alembic"
	@echo "    make seed         Carga los 5 CSVs y genera alertas"
	@echo ""
	@echo "  Tests:"
	@echo "    make test-gemini  Smoke test del agente (verifica GEMINI_API_KEY)"
	@echo "    make test-chat    End-to-end del chat con 5 preguntas tipo"
	@echo "    make check        Lint + tipos + tests unitarios"
	@echo ""
	@echo "  Deploy:"
	@echo "    make deploy       Push a main (CI desplega Vercel + Render)"
	@echo ""
# === Setup ===
# Quick setup para todo el equipo. Detecta SO automáticamente.
# Crea venv, instala Python deps, npm deps, y copia .env.example → .env
setup:
ifeq ($(OS),Windows_NT)
	powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
else
	bash scripts/setup.sh
endif

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

# === Database (Docker) ===
db-up:
	docker run -d --name pulse-pg -p 5432:5432 \
	  -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=pulse \
	  postgres:16

db-start:
	docker start pulse-pg

db-stop:
	docker stop pulse-pg

db-reset:
	-docker rm -f pulse-pg
	$(MAKE) db-up

db-logs:
	docker logs pulse-pg

db-check:
	@python -c "from sqlalchemy import create_engine, text; e=create_engine('postgresql://postgres:postgres@localhost:5432/pulse'); c=e.connect(); print('alerts:', c.execute(text('SELECT COUNT(*) FROM alerts')).scalar()); print('clients:', c.execute(text('SELECT COUNT(*) FROM clients')).scalar()); print('transactions:', c.execute(text('SELECT COUNT(*) FROM transactions')).scalar())"

migrate:
	cd apps/api && alembic upgrade head

# Bootstrap: db-up + espera + migraciones + carga CSVs en 1 comando
bootstrap: db-up
	@python -c "import time; print('Esperando 5s a que Postgres arranque...'); time.sleep(5)"
	$(MAKE) migrate
	$(MAKE) seed
	$(MAKE) db-check

# === Data ===
seed:
	cd apps/ml && python -m etl
	cd apps/ml && python -m run_signals

recalc:
	cd apps/ml && python -m run_signals

# === Demo ===
demo-metrics:
	python scripts/demo_metrics.py seed

reset-demo-metrics:
	python scripts/demo_metrics.py reset

# === Tests ===
test-gemini:
	python scripts/test_gemini.py

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
	@echo "CI deploys to Vercel (web) and Render (api+db) automatically"

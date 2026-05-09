.PHONY: dev seed check deploy api web ml install

# === Setup ===
install:
	cd apps/api && pip install -e .
	cd apps/ml && pip install -e .
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
check:
	cd apps/api && ruff check . && mypy . && pytest -q
	cd apps/ml && ruff check . && mypy .
	cd apps/web && npm run lint && npm run build

# === Deploy ===
deploy:
	git push origin main
	@echo "CI deploys to Vercel (web) and Railway (api+db) automatically"

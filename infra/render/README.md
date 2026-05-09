# Deploy en Render · Pulse

Render reemplaza a Railway. Mismo modelo: web service + Postgres gestionada en el mismo proyecto, conectados por env var.

## Primer deploy (una vez)

1. Crear cuenta en https://render.com (login con GitHub).
2. **New → Blueprint** → conectar el repo `interhackBCN`.
3. Render detecta `infra/render/render.yaml` solo. Si no, indicar la ruta a mano.
4. Render pide los valores de los secretos marcados `sync: false`:
   - `GEMINI_API_KEY` → tu key de https://aistudio.google.com/apikey
   - `ELEVENLABS_API_KEY` → tu key de https://elevenlabs.io
   - `API_BASE_URL` → tras el primer deploy se conoce; rellenar luego con `https://pulse-api.onrender.com` (o la URL real que asigne Render).
5. **Apply**. Render crea:
   - `pulse-pg` (Postgres 16, plan free, región Frankfurt)
   - `pulse-api` (FastAPI, build = `pip install + alembic upgrade head`, start = `uvicorn`)
   - Inyecta `DATABASE_URL` desde la BD al servicio automáticamente.

## Cargar los CSVs en la BD de Render (seed)

El build solo aplica migraciones; no carga datos. Para sembrar:

**Opción A — desde tu máquina contra la BD remota:**

```bash
# Coger la "External Database URL" del dashboard de Render (pulse-pg → Connect)
export DATABASE_URL="postgresql://pulse:...@...frankfurt-postgres.render.com/pulse"
cd apps/ml && python -m etl && python -m run_signals
```

**Opción B — Render Shell:** abrir shell del servicio `pulse-api` y ejecutar el seed allí (los CSVs viajan con el repo via `rootDir`, pero `apps/ml` queda fuera de `rootDir=apps/api`. Así que opción A es la práctica).

## Día a día

- Push a `main` → Render auto-deploya `pulse-api`.
- Logs: dashboard → `pulse-api` → Logs.
- Variables: dashboard → `pulse-api` → Environment.

## Notas

- Plan free duerme tras 15 min sin tráfico. **Para la demo, ping cada 10 min** o pasar a plan `starter` ($7/mes) que no duerme.
- Free Postgres tiene 90 días de vida y 1 GB. Suficiente para hackathon.
- Render entrega `DATABASE_URL` con esquema `postgres://`. SQLAlchemy 2 lo normaliza en `apps/api/database.py`.
- Frontend sigue en Vercel; ajustar `NEXT_PUBLIC_API_URL` a la URL de `pulse-api` en Render.

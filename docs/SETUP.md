# SETUP · Pulse

Guía para arrancar el proyecto en local. Si solo quieres correr cosas sin leer, salta a [TL;DR](#tldr).

> 💡 **`make help`** te lista todos los comandos disponibles del proyecto.

---

## TL;DR

```bash
# 1. Clonar y entrar
git clone https://github.com/criisshg/interhackBCN.git
cd interhackBCN

# 2. Tu branch
git checkout p1-ml | p2-api | p3-web | p4-agent | p5-infra

# 3. Setup deps (1 vez)
make setup

# 4. Activar venv
.\.venv\Scripts\Activate.ps1   # Windows
source .venv/bin/activate       # Mac/Linux

# 5. Edita .env con tu GEMINI_API_KEY (ver más abajo)

# 6. Bootstrap de la BD (Postgres + migraciones + carga CSVs · 1 comando)
make bootstrap

# 7. Arrancar API + Web
make dev
```

Si todo va, abre <http://localhost:3000> (web) y <http://localhost:8000/docs> (API).

---

## Prerequisitos

| Tool | Versión | Para quién | Cómo verificar |
|------|---------|-----------|----------------|
| **Python** | 3.11 o superior | todos | `python --version` |
| **Node.js** | 20 o superior | todos (recomendable) | `node --version` |
| **Git** | cualquiera reciente | todos | `git --version` |
| **Postgres** | 14+ (16 recomendado) | P1, P2, P4 | `psql --version` o Docker |
| **Docker Desktop** | opcional pero útil | todos | `docker --version` |

### Cuentas necesarias

| Servicio | Para quién | Para qué |
|----------|-----------|----------|
| **Google AI Studio** ([aistudio.google.com](https://aistudio.google.com/apikey)) | todos | API key personal de Gemini |
| **GitHub** | todos | acceso al repo |
| **Vercel** | P3, P5 | despliegue del frontend |
| **Railway** | P2, P5 | despliegue de la API + Postgres |
| **n8n cloud** | P5 | extra opcional E2 |
| **ElevenLabs** ([elevenlabs.io](https://elevenlabs.io)) | P3 | API key personal para voice |

---

## Paso 1 · Clonar el repo

```bash
git clone https://github.com/criisshg/interhackBCN.git
cd interhackBCN
```

Si ya lo tienes clonado, sincroniza con `main`:

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
```

---

## Paso 2 · Cambiar a tu branch

| Persona | Branch |
|---------|--------|
| Lukas (P1) | `p1-ml` |
| Big Yahu (P2) | `p2-api` |
| el Cid (P3) | `p3-web` |
| Nig (P4) | `p4-agent` |
| Ger (P5) | `p5-infra` |

```bash
git checkout p4-agent   # ejemplo
```

Antes de empezar a trabajar, **siempre** sincroniza con `main`:

```bash
git fetch origin
git rebase origin/main
```

Si tu rebase tiene conflictos, **no fuerces nada**: pregunta en el canal del equipo.

---

## Paso 3 · Setup automático

El script crea el `.venv`, instala todas las deps Python (`requirements.txt`) y Node (`apps/web/package.json`), y copia los `.env.example` a `.env` correspondientes.

### Windows (PowerShell)

Si es la primera vez, autoriza scripts de PowerShell (no requiere admin):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Luego:

```powershell
.\scripts\setup.ps1
```

### Mac / Linux

```bash
bash scripts/setup.sh
```

### O usando make (cualquier OS)

```bash
make setup
```

El setup tarda ~2-3 min. Verás `Setup completo` al final.

---

## Paso 4 · Configurar `.env`

Después del setup tienes 3 ficheros `.env` creados desde sus plantillas. **Edita cada uno con tus valores reales**:

### `.env` (raíz del proyecto)

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pulse
GEMINI_API_KEY=AIzaSy...   # ← TU key personal de https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### `apps/api/.env`

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pulse
GEMINI_API_KEY=AIzaSy...   # ← misma key que arriba
GEMINI_MODEL=gemini-2.5-flash
ELEVENLABS_API_KEY=sk_...  # solo P3 lo necesita
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
CORS_ORIGINS=http://localhost:3000
```

### `apps/web/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> 🔒 **Nunca commitees ningún `.env`.** El `.gitignore` los protege, pero verifica con `git status` antes de cualquier `git add`.

---

## Paso 5 · Levantar BD + migraciones + datos (1 comando)

### Opción rápida (recomendada): `make bootstrap`

```bash
make bootstrap
```

Hace en orden y sin que tengas que pensar:

1. `make db-up` — crea contenedor Docker de Postgres 16 con BD `pulse`
2. Espera 5 segundos a que Postgres arranque
3. `make migrate` — aplica migraciones Alembic (crea tablas)
4. `make seed` — carga los 5 CSVs de Inibsa + genera alertas
5. `make db-check` — imprime cuántas filas hay en alerts/clients/transactions

Tarda ~1 min la primera vez (descarga la imagen de Postgres). Si todo va bien verás algo como:

```
alerts: 1234
clients: 6037
transactions: 162547
```

### Opción manual (si quieres entender qué pasa)

```bash
make db-up        # Postgres en Docker
# espera ~5s
make migrate      # tablas Alembic
make seed         # ETL + run_signals (carga CSVs y genera alertas)
make db-check     # verifica que hay datos
```

### Opción nativa (sin Docker)

Si prefieres Postgres nativo:

- **Mac**: `brew install postgresql@16 && brew services start postgresql@16`
- **Windows**: instalador desde [postgresql.org](https://www.postgresql.org/download/windows/) (password `postgres`)
- **Linux**: `sudo apt install postgresql-16 && sudo systemctl start postgresql`

```bash
psql -U postgres -c "CREATE DATABASE pulse;"
make migrate
make seed
```

### Comandos de mantenimiento de la BD

| Comando | Para qué |
|---------|----------|
| `make db-stop` | Para Postgres sin destruir datos |
| `make db-start` | Vuelve a arrancar el contenedor |
| `make db-logs` | Ver logs del contenedor |
| `make db-reset` | Borra y recrea (limpia toda la BD) |
| `make db-check` | Imprime contador de filas en tablas clave |
| `make recalc` | Solo regenera alertas (sin recargar CSVs) |

---

## Paso 6 · Arrancar API + Web en local

### Todo a la vez

```bash
make dev
```

Levanta:
- **API** en <http://localhost:8000> · docs interactivos en <http://localhost:8000/docs>
- **Web** en <http://localhost:3000>

### Por separado (si quieres dos terminales)

```bash
# Terminal 1 (API)
make api
# o:
cd apps/api && uvicorn main:app --reload --port 8000

# Terminal 2 (Web)
make web
# o:
cd apps/web && npm run dev
```

---

## Paso 7 · Verificar que todo funciona

### Smoke test del agente Gemini (sin necesidad de API arriba)

```bash
make test-gemini
```

Verifica que tu `GEMINI_API_KEY` funciona. Imprime una respuesta de Gemini.

### Smoke test del chat end-to-end (necesita API levantada en otra terminal)

```bash
make test-chat
```

Lanza 5 preguntas tipo contra `POST /chat` y muestra qué responde el agente. Si las 4 tools funcionan contra los endpoints de la API real, verás respuestas con datos coherentes.

> Para una pregunta puntual: `python scripts/test_chat.py "tu pregunta"`

### API responde

```bash
curl http://localhost:8000/health
# {"status":"ok"}

curl http://localhost:8000/alerts?limit=3
# {"items":[...], "total":..., "limit":3, "offset":0}
```

### Frontend muestra datos

Abre <http://localhost:3000>. Deberías ver la tabla de alertas conectada a la API real.

### Tests unitarios

```bash
make check
```

Corre lint + tipos + tests. Debe pasar todo en verde antes de cualquier `git push`.

---

## Comandos útiles del día a día

> 💡 **`make help`** te lista todos los comandos disponibles con su descripción.

### Setup (1 vez)

| Comando | Para qué |
|---------|----------|
| `make setup` | Instala deps Python + Node + crea `.env` desde plantillas |
| `make bootstrap` | DB + migraciones + carga CSVs en un solo comando |

### Desarrollo

| Comando | Para qué |
|---------|----------|
| `make dev` | Levantar API + Web a la vez |
| `make api` | Solo la API (puerto 8000) |
| `make web` | Solo el frontend (puerto 3000) |

### Base de datos (Postgres en Docker)

| Comando | Para qué |
|---------|----------|
| `make db-up` | Crear contenedor `pulse-pg` (primera vez) |
| `make db-start` | Arrancar contenedor existente |
| `make db-stop` | Parar sin destruir datos |
| `make db-reset` | Borrar y recrear (reset total) |
| `make db-logs` | Ver logs del contenedor |
| `make db-check` | Imprime contador de filas en tablas |
| `make migrate` | Aplicar migraciones Alembic |
| `make seed` | Cargar CSVs + generar alertas |
| `make recalc` | Solo regenerar alertas (sin recargar CSVs) |

### Tests

| Comando | Para qué |
|---------|----------|
| `make test-gemini` | Smoke test del agente (verifica key) |
| `make test-chat` | End-to-end del chat (necesita API arriba) |
| `make check` | Lint + tipos + tests unitarios |

### Git (no son make targets, pero los usas a diario)

| Comando | Para qué |
|---------|----------|
| `git fetch origin && git rebase origin/main` | Sincronizar tu branch con main |
| `git push origin <tu-branch>` | Subir tus commits |

---

## Troubleshooting

### `Set-ExecutionPolicy: cannot be loaded because running scripts is disabled`

Windows bloquea scripts por defecto. Solución (no requiere admin):

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

### `ModuleNotFoundError: No module named 'X'`

El venv no está activado o las deps no están instaladas. Activa el venv y reinstala:

```bash
.\.venv\Scripts\Activate.ps1   # Windows
source .venv/bin/activate       # Mac/Linux
pip install -r requirements.txt
```

### `psycopg2.OperationalError: connection refused`

Postgres no está levantado.

```bash
docker ps                                # ver si pulse-pg está running
docker start pulse-pg                    # arrancarlo
# o, si nunca lo creaste, ver Paso 5
```

### `alembic.util.exc.CommandError: Can't locate revision`

La BD tiene un estado inconsistente. Limpia y vuelve a empezar:

```bash
docker rm -f pulse-pg                    # destruye el contenedor
# repite los pasos 5, 6, 7
```

### El frontend en `localhost:3000` da error de CORS

`apps/api/.env` debe tener `CORS_ORIGINS=http://localhost:3000` y la API tiene que estar reiniciada después del cambio.

### Gemini devuelve `403 Forbidden` o cuota agotada

- Verifica que tu `GEMINI_API_KEY` en `.env` es válida (genera una nueva en <https://aistudio.google.com/apikey>)
- Free tier tiene cuota diaria — espera o sube a tier 1 (necesitas vincular billing)
- Cambia a `gemini-2.5-flash-lite` para gastar menos cuota: `GEMINI_MODEL=gemini-2.5-flash-lite`

### Los CSVs no se ven (`data/raw/` está vacío)

Hicieron pull en una versión antigua antes de que se commitearan los CSVs. Sync:

```bash
git fetch origin
git pull --ff-only origin main   # los CSVs entran como parte del repo
```

### `npm install` falla en `apps/web/`

Borra y reinstala:

```bash
cd apps/web
rm -rf node_modules package-lock.json   # cuidado: si borras el lockfile el setup falla — no commits eso
npm install
```

> ⚠️ **Nunca commitees el borrado de `package-lock.json`**. Si te lo borraste por accidente, recupéralo con `git checkout main -- apps/web/package-lock.json`.

---

## Notas específicas por persona

### Lukas (P1)

Tu trabajo está en `apps/ml/`. Para iterar sobre el modelo:

```bash
make recalc           # regenera alertas tras cambios en signals_*.py
make db-check         # ver contador de filas en alerts
```

Notebook EDA: `apps/ml/notebooks/EDA.ipynb` (necesita `jupyter` ya instalado).

### Big Yahu (P2)

Tu trabajo está en `apps/api/` (excepto `agent/`). Para añadir una migración:

```bash
cd apps/api
alembic revision --autogenerate -m "describe change"
alembic upgrade head
```

### el Cid (P3)

Tu trabajo está en `apps/web/`. Para añadir un componente shadcn:

```bash
cd apps/web
npx shadcn-ui@latest add <componente>   # button, card, table, dialog, etc.
```

### Nig (P4)

Tu trabajo está en `apps/api/agent/` y `apps/api/routers/chat.py`. Después de tocar prompts o tools, no hace falta reiniciar — `uvicorn --reload` lo recarga.

```bash
make test-gemini      # smoke test (verifica key, no necesita API arriba)
make test-chat        # end-to-end (necesita API levantada en otra terminal)
```

### Ger (P5)

Tu trabajo es `infra/`, despliegue, slides, demo. Para deploy manual:

```bash
git push origin main   # CI deploya auto en Vercel y Railway
```

---

## Si nada funciona

1. Cierra terminales, parar Docker, hacer reset y volver al **TL;DR**
2. Pregunta en el canal del equipo con el error completo + qué paso falla
3. No cambies nada de `main` ni `apps/` de otros sin avisar

> 🚨 En hackathon, **producto congelado a partir de h28**. A partir de ahí solo bug fixes con OK de Ger.

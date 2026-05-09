# Pulse — Smart Demand Signals

Solución para el reto **Inibsa Smart Demand Signals** del Interhack BCN 2026.
Convierte 5 años de histórico de ventas a clínicas dentales en alertas
comerciales accionables, diferenciando productos commodity y técnicos, y
clasificando clientes en leales / promiscuos / riesgo de fuga.

## Arquitectura · tres capas

- **`apps/ml/`** — Capa de datos + capa analítica (ETL + motor de señales)
- **`apps/api/`** — Capa de activación · API REST + agente conversacional
- **`apps/web/`** — Dashboard Next.js (Vercel)
- **`infra/`** — n8n workflow (extra opcional), config Railway/Vercel
- **`data/raw/`** — CSVs de Inibsa (no versionados, ver `.gitignore`)

## Quick setup (1 comando)

Después de clonar el repo:

```bash
# Windows (PowerShell)
.\scripts\setup.ps1

# Mac / Linux
bash scripts/setup.sh

# o usando make en cualquiera de los dos
make setup
```

El script:

- Verifica Python 3.11+, Node 20+ y Git
- Crea `.venv` e instala todas las dependencias Python (`requirements.txt`)
- Instala dependencias Node de `apps/web/`
- Copia los `.env.example` a `.env` correspondientes (los **edita tú** con tus valores)

Después:

```bash
# Windows
.\.venv\Scripts\Activate.ps1
# Mac/Linux
source .venv/bin/activate

# Levantar en local
make dev      # API (8000) + Web (3000) en paralelo
make seed     # carga los CSVs en Postgres local
make check    # lint + tipos + tests
```

## Variables de entorno

Edita `.env` con (mínimo viable):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pulse
ANTHROPIC_API_KEY=sk-ant-...   # lo entrega el sponsor en kickoff
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Para producción (Railway + Vercel) los valores los configura Ger (P5) en cada plataforma.

## Equipo (DATA PENTAKILL)

- **P1** Data/ML · `apps/ml`
- **P2** Backend · `apps/api`
- **P3** Frontend · `apps/web`
- **P4** Agent · `apps/api/agent/`
- **P5** Infra + Demo · `infra/`, despliegue, slides

Ver [`CLAUDE.md`](./CLAUDE.md) para contexto completo del proyecto y reglas
de desarrollo. Plan de ejecución en
[`plans/`](https://github.com/criisshg/interhackBCN) (privado).

## Documentación

- [`CLAUDE.md`](./CLAUDE.md) — contexto, reglas, filosofía
- [`docs/MODELS.md`](./docs/MODELS.md) — lógica de modelos y features
- [`docs/DEMO_SCRIPT.md`](./docs/DEMO_SCRIPT.md) — guion de demo y preguntas pre-aprobadas

## Deploys

- Frontend: Vercel — _pendiente de configurar_
- API + DB: Railway — _pendiente de configurar_

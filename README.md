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

## Quick start

```bash
make dev      # levanta API y Web en local
make seed     # carga los CSVs en Postgres local
make check    # lint + tipos + tests
```

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

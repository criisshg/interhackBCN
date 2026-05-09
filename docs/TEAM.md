# Equipo · DATA PENTAKILL

| Rol | Persona | Branch | Owner de |
|-----|---------|--------|----------|
| **P1** Data/ML Lead | **Lukas** | `p1-ml` | `apps/ml/` · `docs/MODELS.md` |
| **P2** Backend / API | **Big Yahu** | `p2-api` | `apps/api/` (excepto `agent/`) |
| **P3** Frontend / UI | **el Cid** | `p3-web` | `apps/web/` |
| **P4** AI / Agent | **Nig** | `p4-agent` | `apps/api/agent/` · `apps/api/routers/chat.py` |
| **P5** Infra + Demo Lead | **Ger** | `p5-infra` | `infra/` · despliegue · slides · video · ensayos · mantiene `main` |

> **Speaker de la demo**: por defecto Ger. Reconfirmable en h20 si otra persona tiene mejor presencia. Solo el speaker habla; el resto contesta preguntas técnicas si las hay.

## Reglas no negociables

- **No tocar el código de otra persona** sin avisarlo en el canal del equipo.
- **PRs pequeños** desde tu branch a `main`. Squash merge. Solo Ger mergea.
- `make check` (lint + tipos + build) **antes** de push.
- Branches sincronizadas con `main` con `git rebase main` (no `merge main`).
- A partir de **h28**: producto congelado. Solo bug fixes con OK de Ger.

## Pre-kickoff · checklist por persona (hacer antes de h0)

### Lukas · P1

- [ ] Python 3.11+ instalado · `python --version`
- [ ] Cuenta GitHub con acceso al repo
- [ ] `pip install pandas numpy scikit-learn duckdb openpyxl jupyter` (o usar `apps/ml/pyproject.toml`)
- [ ] Abrir `apps/ml/notebooks/EDA.ipynb` y verificar que arranca
- [ ] **Echar un primer vistazo a los CSVs en `data/raw/`** (sin compromiso, solo familiarizarse)

### Big Yahu · P2

- [ ] Python 3.11+
- [ ] Postgres local instalado (o Docker para levantarlo) · `psql --version`
- [ ] `pip install -e apps/api` con extras dev
- [ ] Cuenta Railway creada y verificada
- [ ] Familiarizarse con SQLModel + Alembic si no los ha usado

### el Cid · P3

- [ ] Node 20+ y pnpm/npm · `node --version`
- [ ] `cd apps/web && npm install` funciona sin errores
- [ ] `npm run dev` levanta localhost:3000
- [ ] Cuenta Vercel creada y verificada (linkable a GitHub)
- [ ] Conoce shadcn/ui CLI: `npx shadcn-ui@latest init`

### Nig · P4

- [ ] Python 3.11+
- [ ] **Acceso al API key de Anthropic** (sponsor lo entrega en kickoff — confirmar antes)
- [ ] Repasar Anthropic tool-use docs: <https://docs.anthropic.com/en/docs/build-with-claude/tool-use>
- [ ] Tener `anthropic` SDK instalado en local: `pip install anthropic`
- [ ] Probar un Hello World con Claude desde Python en local

### Ger · P5

- [ ] Cuenta Railway + Vercel + n8n cloud creadas
- [ ] Acceso admin al repo (puede mergear PRs y proteger `main`)
- [ ] OBS Studio instalado para grabar video backup
- [ ] Plantilla de slides preparada (Keynote / Google Slides / Pitch.com)
- [ ] **Comprar dominio si quieres uno bonito** (`pulse-inibsa.com` ~10 €) o usar `*.vercel.app` y `*.up.railway.app` por defecto
- [ ] Crear board en Linear o Trello con las columnas: Backlog · F0 · F1 · F2 · F3 · F4 · Demo

## Tareas detalladas por persona

> Cada bloque de tiempo tiene tareas concretas. Marca con ✅ al completar.
> Los hitos al final de cada fase son **deadlines duros**.

---

### LUKAS · P1 · Data/ML

#### F0 (h0–h3) · EDA inicial
- [ ] Leer brief Inibsa + ambos PDFs (briefing v3 y "detalles del reto")
- [ ] Abrir los 5 CSVs en `data/raw/` con pandas (notebook `apps/ml/notebooks/EDA.ipynb`)
- [ ] Reportar al equipo en 1-pager Markdown:
  - volumen total (filas, clientes únicos, productos únicos)
  - distribución temporal (huecos, estacionalidad evidente)
  - % devoluciones (`valor < 0`) y % ceros
  - distribución de potenciales (NA, absurdos, % `low`)
  - **propuesta de qué subfamilia es commodity vs technical** (decisión clave del MVP)
- [ ] Confirmar nombres de columnas finales con Big Yahu (P2) para que ajuste schema

#### F1 (h3–h12) · ETL + señales v1
- [ ] Implementar `apps/ml/etl.py` (carga real, no stub) — **idempotente**
- [ ] Marcar flags: `is_return`, `is_zero`, `is_outlier`, `potential_quality`
- [ ] Implementar `classify.py` v1: tipología `loyal` / `promiscuous` / `at_risk` / `marginal` con umbrales fijos
- [ ] Implementar `signals_commodity.py` v1: regla simple `dias_desde_ultima > umbral`
- [ ] Implementar `signals_technical.py` v1: regla simple `dias_sin_compra > 90` con histórico previo
- [ ] `run_signals.py` orquesta y vuelca en tabla `alerts` con `motivo` legible
- [ ] **Hito h12**: hay >50 alertas reales en BD con `motivo` y `features_json`

#### F2 (h12–h22) · modelos v2
- [ ] Commodity v2: intervalo medio + std, share-of-wallet con `client_potential`, calibración por percentiles globales (que no se inunde)
- [ ] Technical v2: baseline rolling 6m, regla de **deterioro sostenido** (M períodos consecutivos), distinguir pausa normal usando varianza histórica
- [ ] Cada alerta llena `features_json` completo (todos los inputs)
- [ ] `scoring.py`: `prioridad_score = f(impacto, urgencia, prob_conversion)`
- [ ] **Documentar en `docs/MODELS.md`** la lógica completa con valores reales (rellenar los `__`)

#### F3 (h22–h28) · calibración
- [ ] Histograma de alertas por tipología, provincia, subfamilia → ¿están balanceadas?
- [ ] Ajustar **solo umbrales**, no lógica
- [ ] Si sobra: E0 estacionalidad o E0bis clustering KMeans

#### F4 (h28–h36) · datos para slides
- [ ] 2-3 datos llamativos para Ger (€ pipeline detectado, % promiscuos en top decil, etc.)
- [ ] Standby para fixes de calibración
- [ ] Sueño (4h mínimo)

---

### BIG YAHU · P2 · Backend / API

#### F0 (h0–h3) · scaffolding API
- [ ] `cd apps/api && pip install -e .[dev]`
- [ ] Verificar que `uvicorn main:app --reload` arranca y `/health` responde 200
- [ ] **Crear servicio Postgres en Railway** (con Ger). Apuntar `DATABASE_URL` correctamente
- [ ] Schema preliminar con SQLModel (`apps/api/models.py` ya existe, **revisar y ajustar**)
- [ ] Configurar Alembic: `alembic init alembic` + primera migración

#### F1 (h3–h12) · MVP endpoints
- [ ] Esperar nombres finales de columnas de Lukas (h3) → ajustar schema
- [ ] `GET /alerts` con paginación + filtros (`tipo`, `tipologia`, `provincia`, `subfamilia`, `limit`, `offset`)
- [ ] `GET /alerts/{id}` con explicación completa (features + motivo + datos cliente)
- [ ] `GET /clients/{id}` con perfil + timeline + alertas activas
- [ ] `POST /actions` registrar resultado y actualizar `alerts.estado`
- [ ] `POST /run-recalc` ejecuta motor de Lukas y devuelve conteo
- [ ] **Hito h12**: el Cid (P3) consume datos reales sin proxy

#### F2 (h12–h22) · pulido API
- [ ] Endpoint `/stats` con KPIs para el home (#alertas, € pipeline, cobertura)
- [ ] Endpoint `/metrics` con tasas de conversión / FP / recuperación (poblar sintético si no hay actions reales)
- [ ] Índices en `alerts(estado, tipologia_cliente)` y `transactions(client_id, fecha)`
- [ ] Manejo de errores con respuestas JSON consistentes
- [ ] 5–10 tests pytest sobre endpoints críticos (200, 404, paginación)

#### F3 (h22–h28) · hardening
- [ ] Logs estructurados (request_id, latencia)
- [ ] Bug bash con el Cid
- [ ] CORS apuntando a dominio fijo de Vercel (no `*` en prod si hay tiempo)

#### F4 (h28–h36) · standby
- [ ] Standby para fixes críticos
- [ ] Plan de rollback documentado: `git revert HEAD && git push`
- [ ] Sueño (4h mínimo)

---

### EL CID · P3 · Frontend

#### F0 (h0–h3) · scaffolding web
- [ ] `cd apps/web && npm install && npm run dev`
- [ ] **Inicializar shadcn/ui**: `npx shadcn-ui@latest init`
- [ ] Añadir componentes base de shadcn: `button card table badge dialog input`
- [ ] Conectar a Vercel: `vercel link` y deploy `hello world`
- [ ] Configurar `NEXT_PUBLIC_API_URL` apuntando al dominio fijo de Big Yahu (con Ger)

#### F1 (h3–h12) · MVP UI
- [ ] Layout dashboard (header con nombre + nav simple)
- [ ] `app/page.tsx` (home): tabla de alertas conectada a `/alerts` real
- [ ] `app/alerts/[id]/page.tsx`: motivo + features + botón "registrar acción"
- [ ] `app/clients/[id]/page.tsx` básica
- [ ] KPIs en home (mini-cards de `/stats`)
- [ ] **Disclaimer de competencia inferida visible en home y drill-down** (componente ya creado)
- [ ] **No styling fino aún** — funcional > bonito hasta h12
- [ ] **Hito h12**: tabla de alertas reales en URL pública de Vercel

#### F2 (h12–h22) · drill-down + estilo
- [ ] Drill-down con timeline de compras del cliente (Recharts)
- [ ] Marcadores de campañas en el timeline
- [ ] Marcador de "fecha esperada de compra" para commodities
- [ ] Para technical en fuga: gráfica con baseline + banda inferior + datos en zona roja (estilo PDF)
- [ ] Badges de tipología con color (verde leal, naranja promiscuo, rojo at_risk, gris marginal)
- [ ] Filtros funcionales (tipo, tipología, provincia, subfamilia)
- [ ] Estilizado fino con shadcn (cards, dialog), responsive, loading skeletons, estado vacío
- [ ] Embed del **chat panel** (con Nig) en el dashboard (drawer lateral)

#### F3 (h22–h28) · pulido visual
- [ ] Animaciones sutiles
- [ ] Mini-mapa España (E1) por provincia si sobra
- [ ] Bug bash con Big Yahu

#### F4 (h28–h36)
- [ ] Verificar las 3 historias en pantalla grande (monitor externo)
- [ ] Verificar que el chat se ve bien sin scroll horizontal
- [ ] Sueño (4h mínimo)

---

### NIG · P4 · AI / Agent

#### F0 (h0–h3) · scaffolding agent
- [ ] Confirmar acceso al API key de Anthropic (con Ger / sponsor)
- [ ] Probar 1 llamada con `anthropic` SDK en notebook local
- [ ] Definir contrato final de las 4 tools (`tools.py` ya tiene draft, revisar)
- [ ] Decidir modelo: por defecto `claude-opus-4-7` (cambiar a haiku si hay límite de cuota)

#### F1 (h3–h12) · chat endpoint v1
- [ ] Implementar `apps/api/routers/chat.py` con loop de tool-use
- [ ] System prompt fuerte (ya hay draft en `agent/system_prompt.py`)
- [ ] **2 tools funcionales**: `get_alerts` y `get_client` (las que dependen de endpoints de Big Yahu)
- [ ] Streaming SSE si tiempo, si no, response síncrono
- [ ] **Hito h12**: chat responde a "dame 5 alertas" con datos reales

#### F2 (h12–h22) · tools restantes + render
- [ ] `explain_alert(id)`: genera explicación humana a partir de `features_json`
- [ ] `draft_outreach(client_id, intent)`: redacta email o guion según canal
- [ ] Few-shot con 1 ejemplo por tool en el system prompt
- [ ] Render markdown en el chat (con el Cid)
- [ ] Botón "abrir alerta en dashboard" cuando el agente devuelve un ID
- [ ] **Evaluación contra 10 preguntas tipo** (las del `docs/DEMO_SCRIPT.md`)

#### F3 (h22–h28) · prompts production-ready
- [ ] Iterar prompts contra las 10 preguntas hasta que todas respondan correctamente
- [ ] Asegurar que **siempre cita IDs** y **declara competencia inferida** cuando aplica
- [ ] Reducir alucinaciones: si una tool devuelve vacío, decirlo, no inventar
- [ ] Si sobra: E3 (generador de guion comercial) o E6 (what-if)

#### F4 (h28–h36)
- [ ] Standby para fixes de prompt (cambios sin deploy: solo string en `system_prompt.py`)
- [ ] Sueño (4h mínimo)

---

### GER · P5 · Infra + Demo Lead

#### F0 (h0–h3) · cuentas y CI/CD
- [ ] Crear proyecto en Railway (Postgres + servicio API). Compartir `DATABASE_URL` con Big Yahu
- [ ] Crear proyecto en Vercel y linkear repo. Apuntar a `apps/web/` como root
- [ ] Variables de entorno en cada plataforma (lista en `.env.example` de cada paquete)
- [ ] Dominio (si lo tienes) o anotar URLs `*.vercel.app` y `*.up.railway.app`
- [ ] GitHub Actions trivial: lint + build en cada PR (no obligatorio si va apurado)
- [ ] `make dev` y `make seed` deben funcionar para los demás
- [ ] Crear board en Linear/Trello con columnas F0 / F1 / F2 / F3 / F4 / Demo

#### F1 (h3–h12) · monorepo limpio
- [ ] Asegurar que `npm install` y `pip install -e .` funcionan limpios desde clone
- [ ] Empezar slide deck v0 (estructura con placeholders)
- [ ] Apoyar a Big Yahu con endpoints menores si va apurado
- [ ] Mergea los PRs de los 4 a `main` (revisión rápida, no exhaustiva)

#### F2 (h12–h22) · slides + n8n (opcional)
- [ ] **Slide deck v1** con 8 láminas mínimo:
  1. Portada + equipo
  2. Problema (con 1 dato fuerte de Lukas)
  3. Solución en 1 pantalla (mockup del dashboard)
  4. **Tres capas separadas** (datos · analítica · activación) — exigido por briefing v3
  5. Diferenciación commodity vs technical
  6. Tipologías de cliente (leal · promiscuo · at_risk · marginal)
  7. Demo (placeholder, será en vivo)
  8. Arquitectura técnica + escalabilidad CRM
  9. Métricas del sistema (aprende del propio uso)
  10. Cinco impactos de negocio + cierre con frase de sostenibilidad
- [ ] Guion de demo en `docs/DEMO_SCRIPT.md` (3 historias + 10 preguntas pre-aprobadas)
- [ ] **Si sobra**: montar n8n workflow (E2)

#### F3 (h22–h28) · congelación + video
- [ ] **Grabar video backup** (5 min, OBS) — definitivo
- [ ] Slides v2 cerradas
- [ ] **3 historias de demo fijadas** y `client_id` congelados
- [ ] Anunciar **regla de congelación h28** al equipo

#### F4 (h28–h34) · ensayos + sueño
- [ ] **Ensayos cronometrados** mínimo 3 pasadas con todo el equipo presente
- [ ] Coordinar turnos de sueño escalonados (4h/persona)
- [ ] Verificar URL pública desde 3 dispositivos distintos
- [ ] Probar wifi del evento (tethering del móvil como backup)
- [ ] Cargador del portátil + USB con `demo_backup.mp4` listos

#### F5 (h34–h36) · demo
- [ ] Ensayo final completo
- [ ] Slides cargadas en navegador del speaker
- [ ] Tabs precargadas: home, alerta commodity, alerta technical, chat
- [ ] **Pitch en orden** (4 min) según `docs/DEMO_SCRIPT.md`

## Comunicación del equipo

- **Slack/Discord**: canal único `#interhack-pulse` con todos
- **Stand-ups rápidos** (2 min) en h0, h6, h12, h18, h22, h28, h34
- **Bloqueo / SOS**: cualquiera puede pedir ayuda al canal con prefijo `🚨 BLOCKED:`
- **Push reglas**:
  - PR pequeño desde tu branch → review rápido por Ger → squash merge a `main`
  - Si va con prisa: commit directo a tu branch + Ger merge bulk en stand-up
- **Antes de empezar tu fase**: `git checkout main && git pull && git checkout <tu-branch> && git rebase main`

## Reuniones clave

| Hora | Tipo | Atiende | Duración |
|------|------|---------|----------|
| h0 | Kickoff oficial | Todos | 30 min |
| h3 | Sync F0 → F1 | Todos | 10 min |
| h12 | **Checkpoint crítico** (¿simplificar?) | Todos | 15 min |
| h22 | Congelación de historias de demo | Todos | 15 min |
| h28 | **Congelación de producto** | Todos | 10 min |
| h32 | Ensayo demo nº 1 | Todos | 15 min |
| h34 | Ensayo demo final | Todos | 15 min |

## Si algo falla · escalación

- **Bloqueo técnico** > 1h → SOS al canal, alguien pivota
- **Dataset llega tarde** → Lukas genera sintético siguiendo el schema del PDF
- **Frontend atascado** → fallback a Streamlit, decisión antes de h12
- **Agente alucina** → 10 preguntas pre-aprobadas + video backup
- **Despliegue cae en demo** → URL backup + video + slides con screenshots

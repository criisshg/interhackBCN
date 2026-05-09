# Pulse — Smart Demand Signals (Inibsa · Interhack BCN 2026)

Hackathon · 36 h · Equipo de 5 (DATA PENTAKILL).

## Objetivo

Convertir el histórico de Inibsa (≈6.000 clínicas dentales, 25 SKUs en
5 subfamilias, 5 años) en **alertas comerciales accionables** con cuatro
campos mínimos exigidos por el cliente: aviso de contacto, motivo, familia
de producto y nivel de urgencia.

Diferenciamos **dos dinámicas** con lógicas distintas:

- **Commodity**: recurrente, consumo regular. Detectar **demanda no capturada**.
- **Technical**: irregular, dependiente del caso clínico. Detectar **deterioro
  sostenido** sin confundirlo con pausa normal.

Y **tres tipologías de cliente** (driver de la lógica de intervención):

- **Leal**: SoW alto, cadencia regular → reposición esperada.
- **Promiscuo**: gap entre potencial y compras → ventana de captura vs competencia.
- **Riesgo de fuga**: deterioro sostenido respecto a su propio baseline.
- (`marginal`: sin actividad o residual; no genera alerta de fuga.)

> **No observamos compras a competencia**. La inferimos del gap entre
> `client_potential` y compras Inibsa. Cualquier output debe declarar este límite.

## Filosofía

> *"La clave no es la sofisticación técnica, sino la utilidad analítica
> y comercial."* — Inibsa, slide del PDF.

Priorizamos lógica clara, alertas trazables y operativa diaria por encima
de modelos complicados. Heurísticas bien calibradas > black-box mal explicado.

## Cinco principios mínimos (briefing v3, no negociables)

1. **Gobierno de dato** — calidad, consistencia, trazabilidad, manejo de huecos.
2. **Trazabilidad** — reconstruir por qué se generó cada alerta y qué reglas/variables intervinieron.
3. **Priorización** — impacto € + urgencia + valor potencial del cliente.
4. **Aprendizaje** — registro de alerta → acción → resultado, para mejorar reglas y detectar falsos positivos.
5. **Encaje en el flujo comercial** — cada alerta declara quién la gestiona, en qué plazo y cómo se registra el resultado.

## Arquitectura · tres capas separadas (exigencia del briefing v3)

- **Capa de datos** — `apps/ml/etl.py` + Postgres: ingesta, limpieza, schema. Idempotente.
- **Capa analítica** — `apps/ml/{classify,signals_commodity,signals_technical,scoring}.py`: lógica de detección.
- **Capa de activación** — `apps/api` + `apps/web` + (extra) `infra/n8n`: API REST agnóstica de CRM, dashboard, distribución.

Stack:

- `apps/ml`: Python · pandas · scikit-learn · DuckDB (EDA)
- `apps/api`: FastAPI sobre Postgres + chat (Gemini function calling)
- `apps/web`: Next.js 14 + shadcn/ui + Recharts (Vercel)
- `infra/`: Render (API + Postgres), Vercel (front), n8n cloud (extra opcional)

## Datos y dominio

Fuente: 5 CSVs en `data/raw/` — ventas, productos, clientes, potencial, campañas.

- IDs anonimizados. Unidades reales. **Valores monetarios ficticios** que
  pueden ser **negativos (devoluciones)** o **cero (cambios)**.
- Mercado España únicamente (Portugal con menor calidad).
- `clientes` incluye código postal y provincia → habilita vista geográfica.
- `potencial` por cliente×familia. **Puede ser NA o absurdo** (menor que
  ventas reales) → marcar `potential_quality='low'` y excluir de SoW.
- `campañas` solo como **contexto** del patrón. NO usarlas como variable
  explicativa: pueden distorsionar.

## Reglas de modelado

### Tipología (cliente × subfamilia)

- `loyal` si `SoW > 0.7` y cadencia regular
- `promiscuous` si `0.2 < SoW < 0.7` (gap relevante)
- `at_risk` si `loyal` previo y deterioro sostenido en últimos N meses
- `marginal` resto (potencial alto sin compras, o sin potencial)

### Commodity

- Por cliente×subfamilia: intervalo medio (días) entre compras + std.
- Alerta de **captura** (promiscuo/marginal): `dias_desde_ultima >= media + k·std`
  con `k` calibrado por percentiles globales (que no se inunde).
- Alerta de **reposición** (leal): faltan ≤ X días para la próxima esperada.
- Filtrar `unidades<=0` para análisis de cadencia (preservar en histórico).

### Technical

- Baseline rolling 6–12 meses (frecuencia y volumen) por cliente×subfamilia.
- Solo se considera el cliente si tiene histórico suficiente (≥ N períodos).
- **Deterioro sostenido**: M períodos consecutivos por debajo de la banda
  inferior del baseline (`media - k·std`). Un único valor bajo NO es alerta
  (eso sería pausa normal).
- Documentar M, k, mínimo de períodos en `docs/MODELS.md`.

### Cada alerta persiste

- `motivo` (texto humano legible, generado a partir de los features)
- `features_json` (todos los inputs que activaron la alerta → trazabilidad)
- `urgencia_dias`, `impacto_estimado`, `prioridad_score`
- `canal_recomendado` (rep / telesales / marketing — heurística por tipología y € impacto)
- `gestor_responsable`, `plazo_dias`, `estado` (`nueva` → `en_curso` → `convertida` | `desestimada` | `expirada`)

## Tratamiento de anomalías (briefing v3)

- **Pedidos extraordinarios**: outlier de volumen (>3·std individual) → flag `is_outlier`, excluido del baseline pero preservado.
- **Campañas activas**: cruzar con `campanas`; un pico en campaña no cuenta como recuperación orgánica.
- **Rupturas de stock externas**: si un hueco afecta a múltiples clientes a la vez (>X% de la base), etiquetar y no contar como fuga individual.
- **Cambios de política comercial**: si se observa un cambio brusco en agregado, anotarlo (no automático en MVP).
- **Estacionalidad**: si E0 implementado, ajustar baseline; si no, declararlo como limitación conocida.

## Tipología de clínica vs tipología cliente×subfamilia

No confundir:

- **`clinic_segment`** (a nivel cliente): perfil global de la clínica (volumen, mix, regularidad). Usado para inferir consumo esperado en clientes con poco histórico. MVP: 3–4 segmentos por reglas. Extra (E0bis): KMeans.
- **`tipologia`** (a nivel cliente×subfamilia): `loyal` / `promiscuous` / `at_risk` / `marginal`. Driver de la lógica de intervención.

## Métricas del sistema (página `/metrics`)

Demuestran el **principio de aprendizaje** (briefing v3). Calculadas sobre `actions`:

- Tasa de conversión = `convertidas / cerradas`
- Tasa de falsos positivos = `desestimadas / cerradas`
- Tasa de recuperación de inactivos
- Cobertura = `% de alertas con acción registrada en plazo`
- Volumen diario y composición por tipo / tipología

Si en demo no hay datos reales de `actions`, poblar con sintéticos plausibles y declararlo abiertamente.

## Reglas para el agente

- **Solo responde con datos obtenidos vía tools**. Nunca inventar IDs ni cifras.
- Tools: `get_alerts(filters)`, `get_client(id)`, `explain_alert(id)`, `draft_outreach(client_id, intent)`.
- System prompt: citar IDs siempre, formato markdown si pide tabla, **declarar
  que la actividad de competencia es inferida** cuando sea relevante.
- Fuera de dominio (alertas/clientes/productos Inibsa) → declinar.

## Reglas de demo (no negociables)

- **Producto congelado en h28**.
- 3 historias de demo y sus `client_id` fijados en `docs/DEMO_SCRIPT.md` desde h22.
- 10 preguntas pre-aprobadas para el chat documentadas en el mismo fichero.
- Disclaimer de competencia inferida visible en UI (home y drill-down).
- Video backup en `docs/demo_backup.mp4` desde h28.

## Reglas de desarrollo

- Branches por persona (`p1-ml`, `p2-api`, `p3-web`, `p4-agent`, `p5-infra`).
- PRs pequeños, squash a `main`. P5 mantiene `main`.
- `make check` (lint + tipos + build) antes de push.
- Variables de entorno en `.env.example` por paquete; secretos en Render/Vercel.
- Commits en imperativo, en inglés.
- **Sin código defensivo innecesario, sin abstracciones prematuras, sin
  comentarios redundantes**. Trust internal calls. Tres líneas duplicadas son OK.
- **No tocar código de otra persona** sin avisar.

## Comandos

- `make dev` — levanta API + Web en local
- `make seed` — carga los CSVs en Postgres local
- `make check` — lint + tipos + tests
- `make deploy` — push a main (CI auto-deploy en Vercel + Render)

## Roles

- **P1** Data/ML · `apps/ml`
- **P2** Backend · `apps/api` (excepto `agent/`)
- **P3** Frontend · `apps/web`
- **P4** Agent · `apps/api/agent/` y `apps/api/routers/chat.py`
- **P5** Infra/Demo · `infra/`, despliegue, slides, video, ensayos, n8n (extra)

## MLH Sponsors

### Gemini API (chatbot LLM)
- Reemplaza Anthropic Claude. SDK: `google-generativeai`.
- Modelo: `GEMINI_MODEL` (default: `gemini-2.0-flash`). Variable en Render + `.env.example`.
- Function calling con 4 tools en `apps/api/agent/tools.py` (formato `genai.protos`).
- Loop implementado en `apps/api/routers/chat.py`: `send_message` → si hay `function_call` → ejecutar tool → enviar `FunctionResponse` → repetir hasta texto.
- Clave: `GEMINI_API_KEY` (Render secret + `.env.example`).

### ElevenLabs (voz del chatbot)
- TTS del response del agente. SDK: `elevenlabs`.
- Endpoint: `POST /voice` → body `{text, voice_id?}` → devuelve `audio/mpeg` en streaming.
- Voz configurable via `ELEVENLABS_VOICE_ID` (default Rachel `21m00Tcm4TlvDq8ikWAM`), modelo `eleven_multilingual_v2`.
- Claves: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID` (Render secrets).
- El front llama `POST /voice` al recibir un mensaje del agente y reproduce el blob de audio.

### Solana (opcional)
- Caso de uso sugerido: registrar alertas convertidas on-chain como prueba de trazabilidad auditable.
- Stack: `@solana/web3.js` en web + cuenta Devnet para demo.
- No implementado en MVP. Activar solo si el equipo decide dedicar tiempo (P5 coordina).

## Qué NO hacer

- No mergear nada sin que pase `make check`.
- No reescribir esquemas de BD sin avisar a P2.
- No usar `campanas` como variable explicativa del modelo (solo contexto).
- No añadir features fuera del MVP antes de h22.
- No tocar `docs/DEMO_SCRIPT.md` después de h22.
- No claim que vemos competencia: la inferimos.
- No optimizar prematuramente, no añadir tests más allá del mínimo.

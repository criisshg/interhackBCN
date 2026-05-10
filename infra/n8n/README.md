# Pulse · Capa de activación (n8n)

`workflow.json` es la **capa de activación** del reto: un cron diario que recalcula las señales y reparte las alertas prioritarias por email a cada equipo comercial. Demuestra el flujo histórico → señal → alerta → acción comercial que pide el briefing.

## Qué hace el workflow

| Paso | Nodo | Acción |
| --- | --- | --- |
| 1 | `Cron diario 07:00 L-V` | Schedule Trigger, cron `0 7 * * 1-5` (07:00 cada día laborable). |
| 2 | `Recalcular senales (POST /run-recalc)` | HTTP POST a `{API_BASE_URL}/run-recalc`. Timeout **90s** (cold start de Render free tier). Reintenta 2 veces. Con `onError: continueErrorOutput` → un fallo HTTP va a la rama de aviso. |
| 3 | `Recalculo OK?` | IF `$json.ok === true`. Si `false` → rama de aviso al admin y para. |
| 4 | `Aviso fallo al admin` | Gmail. Email HTML de error (timestamp, `error`, `elapsed_seconds`). Recibe input del IF (false) **y** del error output del HTTP. El workflow termina aquí en caso de fallo. |
| 5 | `Recoger alertas (GET /alerts)` | HTTP GET a `{API_BASE_URL}/alerts?limit=100`. Top 100 ordenadas por `prioridad_score` desc. |
| 6 | `Agrupar por canal + HTML` | Code (JS). Agrupa por `canal_recomendado` (rep/telesales/marketing), toma top 10 por canal, traduce `tipologia_cliente` (`loyal`→leal, `promiscuous`→promiscuo, `at_risk`→en riesgo de fuga, `marginal`→marginal), formatea `impacto_estimado` y `prioridad_score` a entero con separador de miles europeo (`.`), y genera la tabla HTML. Devuelve **1 item por canal con alertas**. |
| 7 | `Digest por canal` | Gmail. Envía un email HTML a cada equipo. Destinatario por canal vía env `EMAIL_REP` / `EMAIL_TELESALES` / `EMAIL_MARKETING` (fallback `EMAIL_ADMIN`). Se ejecuta una vez por canal. |
| 8 | `Consultar stats (GET /stats)` | HTTP GET a `{API_BASE_URL}/stats`. Agregados globales. Cuelga en paralelo de `Recoger alertas`. |
| 9 | `Resumen admin + HTML` | Code (JS). Compone el HTML del resumen: alertas generadas (de `/run-recalc`), activas/urgentes/pipeline (de `/stats`), conteo por canal y por tipología. |
| 10 | `Resumen al admin` | Gmail. Email final con totales. Destinatario `EMAIL_ADMIN`. |

Todos los emails incluyen la frase de cierre *"Estas son tus alertas prioritarias de hoy. Cada contacto realizado se registra en Pulse."* y el disclaimer *"La actividad de competencia no se observa directamente; se infiere del gap entre potencial declarado y compras Inibsa."*

### Diagrama

```
Cron 07:00 L-V
   │
   ▼
POST /run-recalc ──(error output)──┐
   │ (success)                     │
   ▼                               ▼
IF ok === true ──(false)────▶ Aviso fallo al admin ─▶ (stop)
   │ (true)
   ▼
GET /alerts?limit=100
   ├──▶ Agrupar por canal + HTML ─▶ Digest por canal (1 email / canal)
   └──▶ GET /stats ─▶ Resumen admin + HTML ─▶ Resumen al admin
```

## Variables de entorno (n8n → Settings → Variables, o env del proceso)

| Variable | Obligatoria | Ejemplo | Descripción |
| --- | --- | --- | --- |
| `API_BASE_URL` | Sí | `https://interhackbcn.onrender.com` (prod) / `http://localhost:8000` (local) | Base de la API de Pulse. Sin `/` final. |
| `EMAIL_ADMIN` | Sí | `admin@equipo.com` | Destinatario del resumen diario y de los avisos de fallo. También fallback de los digests si falta el email de un canal. |
| `EMAIL_REP` | Recomendada | `delegados@equipo.com` | Destinatario del digest del canal `rep`. |
| `EMAIL_TELESALES` | Recomendada | `televenta@equipo.com` | Destinatario del digest del canal `telesales`. |
| `EMAIL_MARKETING` | Recomendada | `marketing@equipo.com` | Destinatario del digest del canal `marketing`. |

> En n8n, las variables de entorno se acceden con `{{ $env.NOMBRE }}` desde expresiones. Defínelas como variables de entorno del proceso de n8n (`API_BASE_URL=...` antes de arrancar) o, en n8n Cloud / Enterprise, en **Settings → Variables**.

## Credenciales

El workflow usa el nodo **Gmail** para enviar emails (`n8n-nodes-base.gmail`, OAuth2). El JSON **no** trae credenciales con ID hardcodeado: al importarlo tendrás que asignar una credencial Gmail OAuth2 a los tres nodos Gmail (`Aviso fallo al admin`, `Digest por canal`, `Resumen al admin`).

Si prefieres SMTP genérico / SendGrid / otro: sustituye los tres nodos Gmail por `n8n-nodes-base.emailSend` (SMTP) o el nodo de tu proveedor, manteniendo los campos `sendTo` (= la expresión `$env.EMAIL_*`), `subject` (= `$json.subject`) y el cuerpo HTML (= `$json.html` / la expresión inline del nodo de fallo).

La API de Pulse es pública (sin auth), así que los nodos HTTP no necesitan credencial.

## Cómo importarlo

1. En n8n: **Workflows → Import from File** → selecciona `infra/n8n/workflow.json`.
2. Asigna la credencial Gmail OAuth2 a los 3 nodos Gmail.
3. Define las variables de entorno (`API_BASE_URL`, `EMAIL_*`). Reinicia n8n si las pones como env del proceso.
4. (Opcional) Cambia la expresión cron del trigger si no quieres 07:00 L-V.

## Cómo probarlo manualmente

1. Abre el workflow en el editor.
2. Click en **Test workflow** (esquina superior) — esto dispara el trigger manualmente, sin esperar al cron.
3. El primer request a `/run-recalc` puede tardar ~30-50s si Render está dormido; es normal.
4. Verifica: recibes 1 email por canal con alertas + 1 email resumen al admin. Si `/run-recalc` devuelve `ok: false` o falla, recibes solo el email de aviso de fallo.
5. Para probar el camino de fallo: pon temporalmente `API_BASE_URL` a una URL inválida y ejecuta — debe llegar el email de aviso y el workflow parar.

## Notas de diseño / limitaciones

- **`/alerts?limit=100`**: el digest y el conteo por canal se basan en las 100 alertas de mayor prioridad, no en las ~1.700 totales. Para el conteo global por tipología se usa `/stats` (que sí es global). Suficiente para el digest "top 10 por canal"; si se quisiera el reparto exacto por canal de todas las alertas, habría que paginar `/alerts` con `offset`.
- **Fan-out tras `/alerts`**: las ramas "digest por canal" y "resumen admin" corren en paralelo desde el mismo output. El orden de envío de emails no está garantizado, pero todos se envían.
- **Sin reintento en los nodos Gmail**: si el envío de email falla, el workflow se detiene en ese punto. Para un demo es aceptable; en producción, añadir `retryOnFail` también a los Gmail.
- **`$env` en las expresiones**: requiere que n8n no tenga bloqueado el acceso a env vars en expresiones (es el comportamiento por defecto).
- **Code nodes**: usan `toLocaleString('de-DE')` para el separador de miles europeo (`.`). Y construyen el HTML por concatenación de strings (no template literals con interpolación de datos sin escapar) — los campos de texto de la alerta van por una función `esc()` que escapa `&`, `<`, `>`.

## Resumen de nodos usados y por qué

- **Schedule Trigger** — cron diario; es la naturaleza "batch diario" del entregable.
- **HTTP Request ×3** (`/run-recalc`, `/alerts`, `/stats`) — la API de Pulse es REST pública; HTTP Request es el nodo natural. Timeout generoso en `/run-recalc` por el cold start de Render. `onError: continueErrorOutput` en `/run-recalc` para capturar fallos HTTP sin abortar el workflow entero.
- **IF** — bifurcación `ok === true` para separar el camino feliz del de fallo, como pide el briefing.
- **Code (JS) ×2** — la agrupación por canal + top 10 + formateo de tabla HTML + traducción de etiquetas es lógica de transformación que no encaja en nodos declarativos; el segundo Code compone el resumen del admin combinando datos de los tres endpoints.
- **Gmail ×3** — capa de salida. Uno por destino lógico: aviso de fallo, digest por canal (iterado), resumen al admin. Se eligió Gmail por ser el proveedor configurado en la instancia; intercambiable por SMTP/SendGrid sin tocar la lógica.

# Modelos · Pulse

Documentación viva de la lógica analítica. **Mantenido por P1.** Es el documento que el jurado va a leer si le interesa el "cómo" — escribirlo en lenguaje accesible, no técnico-críptico.

## Filosofía

Heurísticas calibradas e interpretables > black-box mal explicado. Cada decisión documentada aquí debe ser defendible en 30 segundos.

## Tabla de tipologías (cliente × subfamilia)

| Tipología | Condición | Driver de intervención |
|-----------|-----------|------------------------|
| `loyal` | SoW > 0.7 y cadencia regular | Reposición esperada |
| `promiscuous` | 0.2 < SoW < 0.7 | Ventana de captura vs competencia |
| `at_risk` | era `loyal` y muestra deterioro sostenido | Recuperación urgente |
| `marginal` | resto (sin actividad o sin potencial) | Marketing automation |

> **SoW** = `valor_total_periodo / potencial_periodo` (excluyendo devoluciones y ceros).
> **Cadencia regular** = std del intervalo entre compras < umbral por subfamilia.

## Motor commodity

P1 completa con valores reales tras EDA:

- Periodo de cálculo: últimos `__` meses
- `k` para alerta de captura: `__` (calibrado por percentil global, p.ej. p85)
- Umbral de "cadencia regular": std relativa < `__`
- Reposición se dispara cuando `dias_para_proxima` ≤ `__`

## Motor technical

- Baseline rolling de `__` meses
- `min_periods` = `__` (clientes con menos histórico se excluyen)
- `consecutive_below` = `__` períodos consecutivos bajo banda inferior
- `k_std` para banda inferior = `__`
- **Tratamiento de esporádicos válidos** (E5 si tiempo): si la varianza histórica es alta, requerir más períodos consecutivos.

## Anomalías y tratamiento

| Anomalía | Detección | Tratamiento |
|----------|-----------|-------------|
| Pedido extraordinario | volumen > 3·std individual | flag `is_outlier`, excluido del baseline |
| Devoluciones (`valor < 0`) | flag `is_return` | excluidas de cadencia, visibles en timeline |
| Ceros (`valor == 0`) | flag `is_zero` | excluidos de SoW, visibles en timeline |
| Campañas activas | join con `campaigns` | un pico en campaña no cuenta como recuperación orgánica |
| Ruptura de stock externa | hueco simultáneo en >X% de la base | etiqueta agregada, no fuga individual |
| Estacionalidad | descomposición STL (E0) | ajuste del baseline |

## Scoring de prioridad

```
prioridad_score = impacto_estimado · prob_conversion(tipologia) · urgencia_factor
```

- `impacto_estimado` ≈ `potencial_anual_subfamilia × frac_anual_pendiente`
- `prob_conversion`: loyal 0.60 · promiscuous 0.35 · at_risk 0.25 · marginal 0.15
- `urgencia_factor` = `max(0.1, 1 - urgencia_dias/30)`

## Canal recomendado

- € impacto > 5000 y tipología ∈ {loyal, promiscuous, at_risk} → `rep` (delegado)
- tipología `marginal` → `marketing`
- resto → `telesales`

## Métricas del sistema (`/metrics`)

Calculadas sobre `actions`:

- Tasa de conversión = `convertidas / cerradas`
- Tasa de falsos positivos = `desestimadas / cerradas`
- Tasa de recuperación de inactivos
- Cobertura = `% alertas con acción registrada en plazo`

## Limitaciones declaradas

1. **Competencia no observada**: SoW se infiere de potencial declarado vs ventas observadas. Si el potencial está mal reportado, la inferencia falla.
2. **Estacionalidad**: si E0 no implementado, el baseline puede confundir caídas estacionales con deterioro.
3. **Clientes sin histórico**: clasificados como `marginal` por defecto. Su consumo esperado se infiere desde `clinic_segment` (si existe).
4. **Ruptura de stock**: solo detectable de forma agregada; un cliente individual con ruptura puede aparecer falsamente como fuga.

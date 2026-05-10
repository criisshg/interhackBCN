# Modelos · Pulse

Documentación viva de la lógica analítica. **Mantenido por P1.** Es el documento que el jurado va a leer si le interesa el "cómo" — escribirlo en lenguaje accesible, no técnico-críptico.

## Filosofía

Heurísticas calibradas e interpretables > black-box mal explicado. Cada decisión documentada aquí debe ser defendible en 30 segundos.

## Jerarquía de producto

```
Bloque analítico → Categoría (category) → Familia/Subfamilia (subfamily) → SKU (product_id)
```

| Bloque (`analytical_block`) | Categoría (`category`) | Familia (`subfamily`) | Nombre comercial |
|---|---|---|---|
| `commodity` | `C1` | `C1` | Anestesia |
| `commodity` | `C2` | `C2` | Bioseguridad |
| `technical` | `T1` | `T1` | Biomateriales · Familia T1 |
| `technical` | `T1` | `T2` | Biomateriales · Familia T2 |

**Puntos clave:**
- **No existe Categoría T2.** T2 es una *familia* dentro de Categoría T1 (Biomateriales).
- El potencial comercial existe a nivel `cliente × categoría`. Las familias T1 y T2 comparten el potencial de Categoría T1.
- Los nombres comerciales (Anestesia, Bioseguridad, Biomateriales) provienen de `potencial.csv`. No existen nombres explícitos en el CSV para Familia T1 y Familia T2.
- La tipología se calcula a nivel `cliente × subfamily` (C1/C2/T1/T2), no por SKU individual.
- Columnas `product_category_name`, `product_family_name`, `product_display_name` en la tabla `products` proporcionan nombres humanos para UI y demos.

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

- Periodo de cálculo: histórico completo (5 años)
- `k_std` para alerta de captura: `1.0` (z_score > 1.0 → overdue anómalo)
- `z_percentile_min` = `60` — solo el top-40% más tardíos de los clientes en retraso (F3: anti-inundación)
- Priorización dinámica: percentil global del z_score entre todos los clientes tardíos
- Reposición se dispara cuando `days_since_last >= mean_days - 7`
- Mínimo de compras para calcular cadencia: `2`

## Motor technical

- Baseline rolling de `6` meses (min_periods=3 para los primeros meses)
- `min_periods` = `6` (clientes con menos períodos mensuales se excluyen)
- `consecutive_below` = `3` períodos consecutivos bajo banda inferior
- `k_std` para banda inferior = `1.0` (media - 1·std)
- `drop_pct_min` = `0.20` — la caída real debe ser ≥ 20% del baseline (F3: elimina deterioros marginales)
- Umbral de baseline significativo: `> 100 €` (evita ruido en clientes residuales)
- Solo genera alerta si tipología ∈ {loyal, promiscuous, at_risk}

## Segmentación de clínicas (E0bis)

- Algoritmo: KMeans con K=4 sobre 3 features RFM estandarizadas (total_value, n_purchases, recency_days)
- Segmentos: `VIP`, `Standard`, `Occasional`, `Inactive` (rank por valor promedio de cluster)
- Fallback por reglas disponible con `use_kmeans=False`
- Ejecutado en cada `run_signals.py` y persistido en `clients.clinic_segment`

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

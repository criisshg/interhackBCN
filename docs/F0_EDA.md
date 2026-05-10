# EDA Inicial - Pulse (Fase 0)

**Autor:** Lukas (P1 - Data/ML Lead)

## 1. Volumen Total
- **Filas de ventas analizadas:** 162,546
- **Clientes únicos:** 8,095
- **Productos únicos:** 25

## 2. Distribución Temporal
- **Periodo:** Del 04/01/2021 al 29/12/2025 (5 años de histórico completo).
- **Huecos de meses:** 0 (Tenemos datos continuos para todos los meses).
- **Estacionalidad:** Histórico sólido ininterrumpido sin lagunas.

## 3. Calidad de Datos en Ventas
- **Porcentaje de devoluciones (`valor < 0`):** 2.29%
- **Porcentaje de ceros (`valor == 0`):** 0.90%
*(En la fase de ETL, estos registros deberán marcarse con los flags `is_return` e `is_zero` para no distorsionar el motor de señales)*.

## 4. Distribución de Potenciales
- **Valores NA (Nulos):** 0.00%
- **Valores Absurdos (Negativos):** 0.00%
- **Clientes con potencial 'Low' (Cuartil Inferior):** 21.11%
*(La limpieza en los CSVs es excepcionalmente buena desde el origen)*.

## 5. Propuesta Clave: Commodity vs Technical
Tras analizar el cruce de ventas con productos por subfamilia, los datos muestran dos comportamientos muy marcados:

| Familia (`subfamily`) | Categoría (`category`) | Frecuencia de Ventas | Clientes Únicos | Ticket Medio (€) | Bloque |
|---|---|---|---|---|---|
| **C1** (Anestesia) | C1 | 76,828 | 5,913 | 438.22 | **commodity** |
| **T1** (Biomateriales · F.T1) | T1 | 44,158 | 4,033 | 1,090.22 | **technical** |
| **C2** (Bioseguridad) | C2 | 22,528 | 2,557 | 458.37 | **commodity** |
| **T2** (Biomateriales · F.T2) | T1 | 19,032 | 2,544 | 908.81 | **technical** |

> **Nota de jerarquía:** T2 es una *familia/subfamilia* dentro de *Categoría T1* (Biomateriales).
> No existe una Categoría T2. Ambas familias técnicas (T1 y T2) comparten el mismo potencial
> de categoría (`category = T1`). Los nombres "Familia T1" y "Familia T2" son etiquetas
> operativas — no aparecen como tal en los CSVs originales.

### Conclusión para el MVP
* Las **familias C1 y C2** son claramente **commodity**: mayor frecuencia de compra, gran penetración (~5k y ~2.5k clientes) y ticket medio bajo (~400-450€). Aplica buscar caídas en la regularidad (*share-of-wallet / días sin compra*).
* Las **familias T1 y T2** son claramente **technical**: baja frecuencia pero ticket medio que duplica al commodity (~900-1.100€). Aplica analizar deterioro sostenido a lo largo del tiempo.

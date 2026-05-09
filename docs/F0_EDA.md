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

| Familia | Frecuencia de Ventas | Clientes Únicos | Ticket Medio (€) | Clasificación Propuesta |
|---------|----------------------|-----------------|------------------|-------------------------|
| **Familia C1** | 76,828 | 5,913 | 438.22 | **Commodity** |
| **Familia T1** | 44,158 | 4,033 | 1,090.22 | **Technical** |
| **Familia C2** | 22,528 | 2,557 | 458.37 | **Commodity** |
| **Familia T2** | 19,032 | 2,544 | 908.81 | **Technical** |

### Conclusión para el MVP
* Las **Familias C1 y C2** son claramente **Commodities**: tienen mayor frecuencia de compra, gran penetración de clientes (>5k y >2.5k respectivamente) y un ticket medio bajo (~400€-450€). Aquí aplica buscar caídas en la regularidad (*share-of-wallet / días sin compra*).
* Las **Familias T1 y T2** son claramente **Technical**: se compran con mucha menor frecuencia, pero suponen un ticket medio que duplica al commodity (~900€-1,100€). Aquí aplica analizar el deterioro sostenido a lo largo del tiempo.

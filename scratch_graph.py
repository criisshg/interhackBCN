import pandas as pd
import sqlite3
import matplotlib.pyplot as plt
import seaborn as sns
import json

# Conectar a DB local
conn = sqlite3.connect('pulse_dev.db')
alerts = pd.read_sql("SELECT tipo, prioridad_score, features_json FROM alerts WHERE tipo IN ('CAPTURA', 'REPOSICION')", conn)

# Extraer z_scores para Captura
capturas = alerts[alerts['tipo'] == 'CAPTURA'].copy()
capturas['z_score'] = capturas['features_json'].apply(lambda x: json.loads(x).get('z_score_deviation', 0))

# Extraer percentiles de revenue para Reposicion
reposiciones = alerts[alerts['tipo'] == 'REPOSICION'].copy()

fig, axs = plt.subplots(1, 2, figsize=(14, 5))

# Plot 1: Z-Score para Captura
sns.histplot(capturas['z_score'], bins=30, ax=axs[0], color='tomato', kde=True)
axs[0].axvline(capturas['z_score'].quantile(0.80), color='darkred', linestyle='--', label='P80 (Filtro sugerido)')
axs[0].set_title('Distribución de Severidad (Z-Score) en alertas CAPTURA')
axs[0].set_xlabel('Desviación Z-Score (Días extra sobre la media normalizados)')
axs[0].set_ylabel('Número de Alertas')
axs[0].legend()

# Plot 2: Prioridad (Revenue Percentile) para Reposición
sns.histplot(reposiciones['prioridad_score'], bins=20, ax=axs[1], color='steelblue')
axs[1].axvline(70, color='darkblue', linestyle='--', label='Top 30% (Filtro sugerido)')
axs[1].set_title('Distribución de Importancia (Revenue Percentile) en REPOSICION')
axs[1].set_xlabel('Percentil de Facturación del Cliente (0 a 100)')
axs[1].set_ylabel('Número de Alertas')
axs[1].legend()

plt.tight_layout()
plt.savefig('C:/Users/Lukas/.gemini/antigravity/brain/309938b8-0e13-43e9-87f3-7d63eb02fea8/distribucion_percentiles.png', dpi=300)
print("Gráfico generado en distribucion_percentiles.png")

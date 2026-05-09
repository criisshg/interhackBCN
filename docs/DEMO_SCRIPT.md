# Demo Script · Pulse

**Mantenido por P5.** Congelado a partir de h22 — no se modifica después.

## Speaker

`__` (a designar en h20)

## Tiempos

Total demo: **4 min**.

| Segmento | Tiempo | Pantalla |
|----------|--------|----------|
| Hook + problema | 30 s | Slide |
| Dashboard home | 45 s | URL pública |
| Alerta commodity (cliente promiscuo) | 45 s | URL → drill-down |
| Alerta technical (cliente en fuga) | 45 s | URL → drill-down |
| Conversación con el agente | 45 s | URL → chat panel |
| Cierre + arquitectura | 30 s | Slide |

## Hook (briefing v3 · BCN Clima)

> "Cada alerta priorizada es un kilómetro de delegado evitado y una venta capturada antes que la competencia. Más ventas con menos esfuerzo y menos desplazamientos."

## 3 historias (congeladas en h22 — `client_id` fijos)

### Historia 1 · Cliente promiscuo de commodity
- `client_id`: `__`
- Subfamilia: `__`
- SoW estimado: `__`%
- Mensaje: "alto potencial, comportamiento promiscuo, ventana de captura abierta"

### Historia 2 · Cliente leal en riesgo de fuga (technical)
- `client_id`: `__`
- Subfamilia: `__`
- Caída sostenida en últimos `__` meses
- Mensaje: "deterioro sostenido y consistente, no es ruido"

### Historia 3 · Conversación con el agente
- Pregunta 1: "explícame por qué la alerta del cliente `__`"
- Pregunta 2: "redáctame el email para reactivar a este cliente"

## 10 preguntas pre-aprobadas para el chat (testeadas en h22)

1. ¿Cuántas alertas activas tengo hoy?
2. Dame las 5 más urgentes en Cataluña.
3. ¿Por qué está el cliente `__` en riesgo de fuga?
4. ¿Qué subfamilia concentra más alertas de captura?
5. Dame el perfil del cliente `__`.
6. ¿Cuánto € hay en pipeline detectado?
7. Redáctame un email para reactivar al cliente `__`.
8. ¿Qué clientes promiscuos tengo en Madrid?
9. ¿Cómo se diferencia una alerta commodity de una technical?
10. ¿Qué significa que un cliente sea `at_risk`?

## Cierre

- **Tres capas separadas**: datos · analítica · activación. Agnóstica de CRM.
- **Cinco impactos de negocio** (texto del briefing v3): incrementar ventas en promiscuos · aumentar frecuencia en cuentas con demanda no capturada · reducir pérdida en leales · recuperar inactivos · mejorar reacción ante señales tempranas.
- **Aprende del propio uso**: registramos alerta → acción → resultado.

## Plan de contingencia

- URL caída: abrir `docs/demo_backup.mp4` (5 min, OBS).
- Agente alucina: tener las 10 preguntas pre-aprobadas memorizadas.
- Wifi del evento falla: tethering del móvil del speaker como backup.
- Portátil del speaker se queda sin batería: cargador en mano.

# Operación de metro

Abre la [práctica guiada](../guia.html#operacion-de-metro), el [panel de control](control.html), el [tablero](dashboard.html) y el [simulador](../simulador.html?proyecto=tren). Antes de enviar comandos, espera a que el simulador indique que el broker aceptó sus suscripciones.

El simulador responde a comandos de velocidad, puertas, freno, luces, modo operativo y alarmas. La posición, los pasajeros y los flujos de estación requieren un publicador adicional.

## 📡 Topics MQTT

### Topics que publica el panel de control

- `metro/tren1/velocidad/set` → número (0-80 km/h)
- `metro/tren1/puertas/set` → "open" / "close"
- `metro/tren1/freno_emergencia/set` → "on" / "off"
- `metro/estacion1/luces/set` → "on" / "off"
- `metro/estacion1/evacuacion/set` → "start"
- `metro/estacion1/alarma/set` → "incendio" / "normal"
- `metro/estacion1/congestion/set` → "alta"
- `metro/estacion1/anuncio/set` → "llegada"
- `metro/sistema/modo/set` → "hora_punta" / "baja_demanda" / "normal"

### Topics que muestra el tablero

- `metro/tren1/velocidad` → número (km/h)
- `metro/tren1/ubicacion` → "estacion1" / "estacion2" / "entre estacion1 y estacion2"
- `metro/tren1/puertas` → "open" / "close"
- `metro/tren1/capacidad` → número (0-100%)
- `metro/tren1/freno_emergencia` → "on" / "off"
- `metro/estacion1/pasajeros` → número
- `metro/estacion1/luces` → "on" / "off"
- `metro/estacion1/alarma` → "normal" / "incendio" / "evacuacion" / "freno_emergencia"
- `metro/estacion1/flujos` → "entrada: X, salida: Y"
- `metro/sistema/modo` → "normal" / "hora_punta" / "baja_demanda"

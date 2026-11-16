# Domótica y seguridad del hogar

Abre la [práctica guiada](../guia.html#domotica-y-seguridad-del-hogar), el [panel de control](control.html), el [tablero](dashboard.html) y el [simulador](../simulador.html?proyecto=hogar). Antes de enviar comandos, espera a que el simulador indique que el broker aceptó sus suscripciones.

El simulador responde a luces, puerta, alarma, TV y temperatura, y convierte los eventos en alertas de humo, gas o movimiento.

## 📡 Topics MQTT

### Topics que publica el panel de control

- `hogar/living/luz/set` → "on" / "off"
- `hogar/cocina/luz/set` → "on" / "off"
- `hogar/dormitorio/luz/set` → "on" / "off"
- `hogar/puerta/principal/set` → "open" / "close"
- `hogar/alarma/set` → "enabled" / "disabled"
- `hogar/clima/temperatura/set` → número (16-30)
- `hogar/evento/simulacion/set` → "incendio" / "movimiento" / "persona_llegando" / "gas"
- `hogar/living/tv/set` → "on" / "off"

### Topics que muestra el tablero

- `hogar/living/luz/state` → "on" / "off"
- `hogar/cocina/luz/state` → "on" / "off"
- `hogar/dormitorio/luz/state` → "on" / "off"
- `hogar/puerta/principal/state` → "open" / "close"
- `hogar/alarma/state` → "enabled" / "disabled" / "activada"
- `hogar/clima/temperatura` → número
- `hogar/sensor/humo` → "normal" / "alto"
- `hogar/sensor/movimiento` → "no" / "si"
- `hogar/sensor/gas` → "normal" / "alto"
- `hogar/living/tv/state` → "on" / "off"
- `hogar/living/ventana/state` → "open" / "close"
- `hogar/cocina/refrigerador/temperatura` → número

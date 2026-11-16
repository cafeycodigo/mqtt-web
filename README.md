# Laboratorio MQTT

Cinco prácticas de IoT con panel de control, tablero y ejemplos de mensajes MQTT. La interfaz usa HTML, JavaScript y MQTT.js sobre WebSockets seguros.

| Proyecto | Qué se practica | Cómo se ejecuta |
| --- | --- | --- |
| [Domótica y seguridad del hogar](guia.html#domotica-y-seguridad-del-hogar) | Comandos, confirmación de estado y alertas de sensores | Control, tablero y simulador web |
| [Operación de metro](guia.html#operacion-de-metro) | Velocidad, puertas y freno de emergencia | Control, tablero y simulador web |
| [Alimentación y agua para mascotas](guia.html#alimentacion-y-agua-para-mascotas) | Telemetría, umbrales y comandos al dispensador | Control con datos de prueba y tablero |
| [Seguimiento de entregas](guia.html#seguimiento-de-entregas) | Eventos JSON y ciclo de un pedido por ID | Simulación integrada en el control y tablero |
| [Buzón con aviso de correo](guia.html#buzon-con-aviso-de-correo) | Evento de detección, estado y marca de tiempo | Simulación integrada en el control y tablero |

## Ejecutar el laboratorio

1. Configura un broker de laboratorio con WSS y cuentas de prueba en [env/credential.js](env/credential.js). Cada página usa `createMqttClient` con el perfil del proyecto. El control necesita permisos de publicación, el tablero de suscripción y el simulador de ambos.
2. Inicia el servidor desde la raíz del repositorio con `python -m http.server 8000` y abre [localhost:8000](http://localhost:8000/).
3. Sigue la [guía de prácticas](guia.html). Cada ejercicio indica el topic, el payload y el resultado que debe verse en el tablero.

Las bibliotecas se descargan desde CDN. Los tableros mantienen sus datos de demostración en memoria y reciben nuevas publicaciones mientras están abiertos. Las carpetas y los topics existentes sirven para integrar otros publicadores MQTT.

El navegador puede leer las credenciales que se sirvan en `env/credential.js`. Usa cuentas de laboratorio con permisos limitados a los topics del ejercicio. Antes de publicar el sitio, revisa el acceso al broker y retira cualquier credencial privada del contenido estático.

El [catálogo de ideas](projects_index.html) describe propuestas para futuras prácticas.

## Editar las vistas de Control y Tablero

Las cinco prácticas comparten [estilos de Tailwind](ui/estilos.css) y [variables de diseño](ui/tokens.css). Edita los archivos HTML en la carpeta de cada proyecto para cambiar su contenido. Después de modificar clases o estilos, compila la hoja local desde la raíz del repositorio.

```sh
npx --yes tailwindcss@3.4.19 -c ui/tailwind.config.cjs -i ui/estilos.css -o ui/tailwind.css --minify
```

## Cumbre

[Cumbre](cumbre/game.html) se conecta automáticamente al broker público de HiveMQ por MQTT sobre WebSocket seguro. Abre el juego y pulsa **Abrir tablero** para compartir la sala. La [guía de Cumbre](guia.html#cumbre) describe cómo jugar desde otro dispositivo y documenta los mensajes de movimiento y estado.

## Ejercicios de juego

En la [lista de juegos](index.html#propuestas-titulo), el nombre abre el análisis 3D y **Jugar** abre la partida. Pulsa **Empezar partida** para jugar desde esa pantalla. En juegos de dos o más personas, comparte el enlace del puesto de cada jugador que aparece en **Sala MQTT**. La pantalla anfitriona debe seguir abierta. Para usar otro dispositivo, abre el sitio desde la misma dirección accesible para todos.

Cada partida usa dos topics en el broker público de HiveMQ. `juegos/<juego>/<sala>/control` recibe acciones y mandos pulsados. `juegos/<juego>/<sala>/estado` lleva el estado calculado por el anfitrión. Abre **Ver datos MQTT** para observar el JSON en vivo. El anfitrión también admite los controles locales cuando el broker no está disponible.

## Condominio inteligente

Inicia el servidor local desde la raíz con `python -m http.server 8000`. Desde la portada abre [Control](condominio-inteligente/control.html) y [Tablero](condominio-inteligente/dashboard.html) en dos pestañas con la misma dirección de servidor. En Control puedes operar el portón y las luces, simular credenciales NFC y RF y revisar alertas. En el Tablero puedes monitorear los accesos, el perímetro, la energía solar y el historial de actividad.

El estado de la demostración se guarda en ese navegador y los cambios aparecen en ambas vistas. El archivo [estado.js](condominio-inteligente/estado.js) contiene las zonas, sectores, credenciales ficticias y las reglas de simulación. Los estilos se compilan con el comando de Tailwind del laboratorio.

En el Tablero, la **Central de movimientos** reúne el registro actualizado, la maqueta 3D, los accesos, las alertas activas, los estados de entrega de los reportes, la iluminación y la energía solar. Busca por persona, sector o sensor para localizar eventos. En **Alertas activas**, pulsa **Ubicar** para seleccionar la baliza del sector en el mapa.

### Enviar reportes de alarma

En **Control → Reportes**, guarda la URL del sistema que recibirá las alertas. Cada nueva detección de movimiento genera un reporte y envía un `POST` con `Content-Type: application/json`. El cuerpo incluye `id`, `type` (`alarma.perimetral.movimiento`), `detectedAt` en UTC, `sector`, `sensor` y `simulation: true`. El receptor puede deduplicar por `id`, que se conserva al reintentar.

Una respuesta HTTP 2xx se muestra como **Aceptado**. Si el receptor está en otro origen, debe permitir el origen del panel mediante CORS y aceptar la solicitud previa `OPTIONS` para `POST` con el encabezado `Content-Type`. En Control puedes enviar reportes pendientes y reintentar los que fallaron. El Tablero muestra el estado de cada entrega en **Reportes de alarma** y los resultados en **Movimientos y eventos**.

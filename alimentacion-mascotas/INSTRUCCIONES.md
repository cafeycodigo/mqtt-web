# Alimentación y agua para mascotas

## 📋 Descripción General

Sistema IoT completo para monitorear y controlar una estación de alimentación para mascotas en tiempo real utilizando protocolo MQTT. Permite supervisar niveles de comida y agua, actividad del animal, y controlar el dispensador de forma remota.

## 🎯 Características Principales

### 1. **Monitoreo de Alimentación**
- **Nivel de Comida**
  - Rango: 0-500 gramos
  - Alertas cuando < 100g
  - Visualización con barra de progreso
  - Historial gráfico

- **Nivel de Agua**
  - Rango: 0-1000 mililitros
  - Alertas cuando < 200ml
  - Visualización con barra de progreso
  - Historial gráfico

### 2. **Monitoreo de Actividad**
- Detección de movimiento del animal
- Tres niveles: Baja, Media, Alta
- Indicadores visuales interactivos
- Registro de actividad diaria

### 3. **Control del Dispensador**
- Activación remota
- Cantidad configurable (10-200g)
- Confirmación de dispensación
- Registro de eventos

### 4. **Configuración de Horarios**
- Dos horarios de alimentación automática
- Formato 24 horas
- Guardado persistente
- Notificaciones de configuración

## 🏗️ Arquitectura del Sistema

### Componentes

1. **Dashboard (dashboard.html)**
   - Visualización en tiempo real
   - Gráficas de consumo
   - Panel de actividad
   - Logs de eventos
   - Alertas automáticas

2. **Panel de Control (control.html)**
   - Dispensador de comida
   - Actualización de niveles
   - Configuración de horarios
   - Acciones rápidas

3. **Broker MQTT**
   - HiveMQ Cloud
   - Comunicación en tiempo real
   - QoS 1 para garantizar entrega

## 📡 Topics MQTT

### Monitoreo (Dashboard recibe)
```
mascotas/cristobal/comida/nivel           # Número (0-500)
mascotas/cristobal/agua/nivel             # Número (0-1000)
mascotas/cristobal/actividad/estado       # baja | media | alta
mascotas/cristobal/dispensador/estado     # activado | desactivado
mascotas/cristobal/horario/estado         # configurado
```

### Control (Control Panel publica)
```
mascotas/cristobal/dispensador/activar    # Número (gramos a dispensar)
mascotas/cristobal/comida/nivel           # Número (actualizar nivel)
mascotas/cristobal/agua/nivel             # Número (actualizar nivel)
mascotas/cristobal/actividad/estado       # baja | media | alta
mascotas/cristobal/horario/configurar     # JSON: {horario1, horario2}
```

## 🚀 Instalación y Uso

### Requisitos Previos
- Navegador web moderno (Chrome, Firefox, Edge)
- Conexión a Internet (para MQTT y CDN)
- Archivo `credential.js` configurado

### Configuración

1. **Verificar credenciales MQTT**
   - El archivo `../env/credential.js` debe contener la configuración `client_cristobal`
   - Ya está configurado con HiveMQ Cloud

2. **Abrir el Dashboard**
   ```
   Abrir: alimentacion-mascotas/dashboard.html
   ```
   - Visualiza el estado de la estación en tiempo real
   - Recibe todas las actualizaciones automáticamente
   - Ve gráficas de consumo histórico

3. **Abrir el Panel de Control**
   ```
   Abrir: alimentacion-mascotas/control.html
   ```
   - Ejecuta acciones sobre la estación
   - Controla dispensador, niveles y horarios

### Flujo de Trabajo Típico

1. **Configuración Inicial**
   - Abrir dashboard para monitoreo
   - Desde control panel: resetear niveles (comida 500g, agua 1000ml)
   - Configurar horarios de alimentación

2. **Durante Operación**
   - Dashboard muestra niveles en tiempo real
   - Alertas automáticas cuando niveles bajos
   - Gráficas muestran tendencias de consumo
   - Monitoreo de actividad del animal

3. **Mantenimiento**
   - Rellenar comida/agua cuando sea necesario
   - Ajustar horarios según necesidad
   - Revisar historial de consumo

## 🎨 Características de la Interfaz

### Dashboard
- **Diseño Colorido** con tonos coral, turquesa y amarillo
- **Tarjetas Informativas** para cada métrica
- **Barras de Progreso** animadas
- **Gráfica Interactiva** con Chart.js
- **Logs en Tiempo Real** con códigos de color
- **Indicadores de Actividad** interactivos

### Control Panel
- **Interfaz por Secciones** organizada por función
- **Botones de Acción** con iconos claros
- **Confirmaciones** para acciones críticas
- **Notificaciones** de éxito/error
- **Inputs Validados** para valores seguros

## 📊 Casos de Uso Detallados

### 1. Dispensar Comida Automáticamente
**Control Panel:**
1. Ir a "Dispensador de Comida"
2. Ajustar cantidad (ej: 50g)
3. Click en "Dispensar Comida Ahora"
4. Confirmar acción

**Dashboard:**
- Aparece notificación "Dispensador activado"
- El nivel de comida se reduce
- Se registra en logs con timestamp
- La gráfica se actualiza

### 2. Configurar Alimentación Automática
**Control Panel:**
1. Ir a "Horario de Alimentación"
2. Establecer primer horario (ej: 08:00)
3. Establecer segundo horario (ej: 18:00)
4. Click en "Guardar Horario"

**Dashboard:**
- Se registra "Horario configurado"
- Los horarios quedan guardados
- El sistema dispensará automáticamente

### 3. Monitorear Actividad del Animal
**Control Panel:**
1. Ir a "Actividad del Animal"
2. Seleccionar nivel (Baja/Media/Alta)
3. Click en "Actualizar Actividad"

**Dashboard:**
- El indicador visual se actualiza
- Se resalta el nivel correspondiente
- Se registra en logs

### 4. Rellenar Estación Completa
**Control Panel:**
1. Ir a "Acciones Rápidas"
2. Click en "Rellenar Todo"
3. Confirmar acción

**Dashboard:**
- Comida se resetea a 500g
- Agua se resetea a 1000ml
- Barras de progreso al 100%
- Alertas desaparecen

## 🔧 Personalización

### Modificar Capacidades Máximas
Editar en ambos archivos (dashboard.html y control.html):

**Dashboard:**
```javascript
// Línea ~450
const percentage = (food / 500) * 100; // Cambiar 500 por nueva capacidad

// Línea ~465
const percentage = (water / 1000) * 100; // Cambiar 1000 por nueva capacidad
```

**Control Panel:**
```javascript
// Línea ~350
<input type="number" id="food-level" value="0" min="0" max="500"> // Cambiar max

// Línea ~360
<input type="number" id="water-level" value="0" min="0" max="1000"> // Cambiar max
```

### Modificar Umbrales de Alerta
Editar en `dashboard.html`:
```javascript
// Línea ~455
if (food < 100) { // Cambiar 100 por nuevo umbral

// Línea ~470
if (water < 200) { // Cambiar 200 por nuevo umbral
```

### Cambiar Colores
Editar variables CSS en ambos archivos:
```css
:root {
    --primary: #ff6b6b;    /* Color principal (coral) */
    --secondary: #4ecdc4;  /* Color secundario (turquesa) */
    --accent: #ffe66d;     /* Color de acento (amarillo) */
}
```

### Agregar Nuevos Horarios
Actualmente soporta 2 horarios. Para agregar más:

1. En `control.html`, agregar más inputs de tiempo
2. Modificar la función `configurarHorario()` para incluir los nuevos horarios
3. Actualizar el JSON enviado por MQTT

## 🔒 Seguridad

- **QoS 1**: Garantiza entrega de mensajes importantes
- **Confirmaciones**: Acciones críticas requieren confirmación del usuario
- **Validación**: Inputs validados con rangos min/max
- **Logs Completos**: Registro de todas las acciones
- **Conexión Segura**: WSS (WebSocket Secure)

## 📝 Notas Importantes

1. **Ambos archivos deben estar abiertos simultáneamente** para funcionamiento completo
2. **El dashboard es de solo lectura** (monitoreo)
3. **El control panel ejecuta acciones** (escritura)
4. **Los cambios son instantáneos** gracias a MQTT
5. **No requiere servidor backend** - todo funciona en el navegador
6. **Las gráficas guardan hasta 20 puntos** de historial

## 🐛 Troubleshooting

### No se conecta a MQTT
- Verificar conexión a Internet
- Revisar credenciales en `credential.js`
- Verificar consola del navegador (F12)

### No se actualizan los niveles
- Verificar que ambos archivos estén abiertos
- Revisar suscripciones en consola
- Verificar que los topics coincidan

### Las gráficas no aparecen
- Verificar que Chart.js se cargó correctamente
- Revisar consola para errores
- Verificar que hay datos para mostrar

### Alertas no aparecen
- Verificar umbrales de alerta
- Revisar que los niveles estén por debajo del umbral
- Verificar logs en consola

## 📞 Soporte

Para problemas o mejoras, revisar:
- Consola del navegador (F12 > Console)
- Logs en tiempo real en el dashboard
- Estado de conexión MQTT

## 🔄 Actualizaciones Futuras

Posibles mejoras:
- [ ] Integración con sensores físicos reales
- [ ] Notificaciones push al móvil
- [ ] Historial de datos en base de datos
- [ ] Múltiples mascotas
- [ ] Cámara de monitoreo
- [ ] Análisis de patrones de consumo
- [ ] Recomendaciones automáticas

---

**Desarrollado para el cuidado inteligente de mascotas**  
Sistema de Monitoreo en Tiempo Real v1.0

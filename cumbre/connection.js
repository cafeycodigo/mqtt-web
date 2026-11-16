const GAME_NAME = 'plataformas';
const ROOM_PATTERN = /^[a-z0-9-]{1,32}$/;
const DEFAULT_BROKER = 'wss://broker.hivemq.com:8884/mqtt';
const ROOM_STORAGE_KEY = 'cumbre-room';
const MQTT_SCRIPT = 'https://unpkg.com/mqtt@5.14.1/dist/mqtt.min.js';
let mqttLibrary;

function defaultRoom() {
    const random = Array.from(crypto.getRandomValues(new Uint32Array(2)), part => part.toString(16).padStart(8, '0'));
    const generated = `cumbre-${random.join('')}`;
    try {
        const saved = localStorage.getItem(ROOM_STORAGE_KEY);
        if (saved && ROOM_PATTERN.test(saved)) return saved;
        localStorage.setItem(ROOM_STORAGE_KEY, generated);
    } catch {
        // The link between the pages still shares the room when storage is unavailable.
    }
    return generated;
}

function loadMqtt() {
    if (!mqttLibrary) {
        mqttLibrary = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = MQTT_SCRIPT;
            script.onload = () => resolve(window.mqtt);
            script.onerror = () => {
                script.remove();
                mqttLibrary = undefined;
                reject(new Error('No se pudo cargar MQTT.js.'));
            };
            document.head.append(script);
        });
    }
    return mqttLibrary;
}

function openGameLink(role, receive, onChange) {
    const sendType = role === 'game' ? 'estado' : 'control';
    const receiveType = role === 'game' ? 'control' : 'estado';
    const fields = {
        control: [
            ['direction', '<code>-1</code> izquierda, <code>0</code> sin movimiento, <code>1</code> derecha.'],
            ['jump', '<code>true</code> solicita un salto.'],
            ['reset', '<code>true</code> reinicia la partida.']
        ],
        estado: [
            ['gems', 'Balizas recogidas, entre 0 y 5.'],
            ['falls', 'Número de caídas en esta partida.'],
            ['won', '<code>true</code> cuando el personaje llega a la bandera.']
        ]
    };
    function renderMessage(label, type, id) {
        const definitions = fields[type].map(([field, description]) =>
            `<li><code>${field}</code> ${description}</li>`
        ).join('');
        return `<section>
            <h2>${label} ${type}</h2>
            <p>Topic <code id="${id}-topic"></code></p>
            <ul>${definitions}</ul>
            <p>Último mensaje</p>
            <pre id="${id}-message">Esperando mensajes…</pre>
        </section>`;
    }
    const panel = document.getElementById('connection');
    panel.innerHTML = `
        <details>
            <summary>Conexión y sala</summary>
            <form class="settings">
                <label>Transporte
                    <select name="mode"><option value="mqtt">MQTT</option><option value="local">Local (mismo navegador)</option></select>
                </label>
                <label>Sala
                    <input name="room" required maxlength="32" pattern="[a-z0-9\\-]{1,32}">
                </label>
                <label class="broker" hidden>URL WebSocket del broker
                    <input name="broker" type="url">
                </label>
                <label class="credentials" hidden>Usuario MQTT<input name="username" autocomplete="off"></label>
                <label class="credentials" hidden>Contraseña MQTT<input name="password" type="password" autocomplete="off"></label>
                <div class="settings-actions"><button type="submit">Conectar</button></div>
            </form>
        </details>
        <p id="link-status" role="status"></p>
        <details class="mqtt-data">
            <summary>Datos MQTT</summary>
            <p id="mqtt-local" hidden>En modo local, las pantallas se comunican en el mismo navegador.</p>
            <div id="mqtt-messages" class="mqtt-messages">
                ${renderMessage('Envía', sendType, 'mqtt-out')}
                ${renderMessage('Recibe', receiveType, 'mqtt-in')}
            </div>
            <p id="mqtt-behavior">MQTT usa JSON, QoS 0 (sin confirmación de entrega) y mensajes sin retención. El tablero repite la dirección cada 100 ms mientras la mantienes pulsada. El juego envía su estado aproximadamente cada 600 ms.</p>
        </details>`;
    const form = panel.querySelector('form');
    const status = panel.querySelector('#link-status');
    const sentTopic = panel.querySelector('#mqtt-out-topic');
    const receivedTopic = panel.querySelector('#mqtt-in-topic');
    const sentMessage = panel.querySelector('#mqtt-out-message');
    const receivedMessage = panel.querySelector('#mqtt-in-message');
    const { mode, room, broker, username, password } = form.elements;
    const params = new URLSearchParams(location.search);
    const requestedRoom = params.get('sala');
    room.value = requestedRoom && ROOM_PATTERN.test(requestedRoom) ? requestedRoom : defaultRoom();
    mode.value = params.get('modo') === 'local' ? 'local' : 'mqtt';
    broker.value = DEFAULT_BROKER;
    let transport;
    let attempt = 0;

    function updatePeerLink() {
        const peer = document.querySelector('[data-peer]');
        const url = new URL(peer.href);
        url.searchParams.set('sala', room.value);
        if (mode.value === 'local') url.searchParams.set('modo', 'local');
        else url.searchParams.delete('modo');
        peer.href = url.href;
    }

    async function connect() {
        if (!ROOM_PATTERN.test(room.value)) return;
        const useMqtt = mode.value === 'mqtt';
        let brokerUrl;
        if (useMqtt) {
            try {
                brokerUrl = new URL(broker.value);
                if (!['ws:', 'wss:'].includes(brokerUrl.protocol) || brokerUrl.username || brokerUrl.password) {
                    throw new Error();
                }
                if (location.protocol === 'https:' && brokerUrl.protocol !== 'wss:') {
                    status.textContent = 'En este sitio HTTPS usa un broker con wss://.';
                    return;
                }
            } catch {
                status.textContent = 'Escribe una URL de broker ws:// o wss://.';
                return;
            }
        }

        const current = ++attempt;
        transport?.close();
        transport = undefined;
        onChange();
        updatePeerLink();
        const prefix = `${GAME_NAME}/${room.value}`;
        const publication = `${prefix}/${sendType}`;
        const subscription = `${prefix}/${receiveType}`;
        panel.querySelector('#mqtt-local').hidden = useMqtt;
        panel.querySelector('#mqtt-messages').hidden = !useMqtt;
        panel.querySelector('#mqtt-behavior').hidden = !useMqtt;
        sentTopic.textContent = publication;
        receivedTopic.textContent = subscription;
        sentMessage.textContent = receivedMessage.textContent = 'Esperando mensajes…';
        if (!useMqtt) {
            if (typeof BroadcastChannel !== 'function') {
                status.textContent = 'Este navegador requiere el modo MQTT.';
                return;
            }
            const channel = new BroadcastChannel(prefix);
            channel.onmessage = ({ data }) => {
                if (data?.type === receiveType) receive(data.payload);
            };
            transport = {
                send(payload) { channel.postMessage({ type: sendType, payload }); },
                close() { channel.close(); }
            };
            status.textContent = 'Modo local activo.';
            return;
        }

        status.textContent = 'Conectando al broker…';
        try {
            const mqtt = await loadMqtt();
            if (current !== attempt) return;
            const client = mqtt.connect(brokerUrl.href, {
                username: username.value || undefined,
                password: password.value || undefined,
                connectTimeout: 5000,
                reconnectPeriod: 1500,
                queueQoSZero: false
            });
            let ready = false;
            transport = {
                send(payload) {
                    if (!ready || !client.connected) return;
                    const message = JSON.stringify(payload);
                    client.publish(publication, message);
                    if (sentMessage.textContent !== message) sentMessage.textContent = message;
                },
                close() { client.end(true); }
            };
            client.on('connect', () => {
                client.subscribe(subscription, { qos: 0 }, (error, granted) => {
                    if (current !== attempt) return;
                    ready = !error && granted?.[0]?.qos === 0;
                    status.textContent = ready ? 'MQTT conectado.' : 'El broker rechazó la suscripción.';
                });
            });
            client.on('message', (topic, payload, packet) => {
                if (current !== attempt || topic !== subscription || packet.retain || payload.length > 512) return;
                let data;
                try {
                    data = JSON.parse(payload.toString());
                } catch {
                    return;
                }
                const message = JSON.stringify(data);
                if (receivedMessage.textContent !== message) receivedMessage.textContent = message;
                receive(data);
            });
            client.on('close', () => {
                ready = false;
                if (current === attempt) {
                    status.textContent = 'Sin conexión al broker.';
                    onChange();
                }
            });
            client.on('reconnect', () => {
                if (current === attempt) status.textContent = 'Reconectando al broker…';
            });
            client.on('error', () => {
                if (current === attempt) status.textContent = 'Error MQTT. Revisa la URL y las credenciales.';
            });
        } catch (error) {
            if (current === attempt) status.textContent = error.message;
        }
    }

    function updateSettings() {
        const useMqtt = mode.value === 'mqtt';
        for (const field of form.querySelectorAll('.broker, .credentials')) field.hidden = !useMqtt;
        broker.required = useMqtt;
    }

    mode.addEventListener('change', updateSettings);
    form.addEventListener('submit', event => {
        event.preventDefault();
        connect();
    });
    updateSettings();
    connect();
    return { send(payload) { transport?.send(payload); } };
}

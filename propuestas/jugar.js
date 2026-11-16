const element = name => document.getElementById(name);
const query = new URLSearchParams(location.search);
const game = query.get('juego');
const guest = query.has('jugador');
const guestSeat = Number(query.get('jugador'));
const fixedRoom = query.get('sala');

if (Object.hasOwn(rules, game) && (!guest || (ROOM_PATTERN.test(fixedRoom ?? '') &&
        Number.isInteger(guestSeat) && guestSeat >= 1 && guestSeat <= rules[game].seats))) {
    setup();
} else {
    element('invalid').hidden = false;
}

function setup() {
    const definition = rules[game];
    const description = proposals[game];
    const randomId = () => Array.from(crypto.getRandomValues(new Uint32Array(2)), n => n.toString(16).padStart(8, '0')).join('');
    const room = ROOM_PATTERN.test(fixedRoom ?? '') ? fixedRoom : randomId();
    const clientId = randomId();
    const controlTopic = `juegos/${game}/${room}/control`;
    const stateTopic = `juegos/${game}/${room}/estado`;
    const ctx = element('board').getContext('2d');
    const liveControls = new Map();
    const remoteInputs = new Map();
    const seen = new Map();
    const actions = new Map();
    let mqttClient;
    let online = false;
    let packetSequence = 0;
    let stateSequence = -1;
    let lastState = 0;
    let lastPublish = 0;
    let lastTick = performance.now();
    let count = game === 'carrera' ? 2 : definition.seats;
    let partida = guest ? '' : randomId();
    let state = guest ? null : definition.create(count);
    let started = false;

    document.title = `${description.title} | Laboratorio MQTT`;
    element('title').textContent = description.title;
    element('summary').textContent = description.summary;
    element('game-cover').src = `../assets/juegos/${game}.webp`;
    element('analysis-link').href = `analisis.html?juego=${game}`;
    element('analysis-link').hidden = false;
    element('role').textContent = guest
        ? playerName(guestSeat)
        : 'Anfitrión · puedes jugar aquí o compartir los enlaces de la sala.';
    element('instructions').textContent = guest
        ? 'Usa los botones o las teclas que aparecen en tu tablero.'
        : definition.hint;
    element('room-name').textContent = `Sala ${room}`;
    element('control-topic').textContent = controlTopic;
    element('game-topic').textContent = stateTopic;
    element('start-form').hidden = guest;
    element('seat-count-label').hidden = guest || game !== 'carrera';
    element('seat-label').hidden = guest || count === 1 || game === 'cuatro';
    element('session').hidden = false;

    function playerName(seat) {
        if (game === 'puente') return seat === 1 ? 'Explorador' : 'Operador del puente';
        return `Jugador ${seat}`;
    }

    function refreshSeats() {
        if (guest) return;
        const select = element('seat');
        const previous = Number(select.value || 1);
        select.replaceChildren(...Array.from({ length: count }, (_, i) => new Option(playerName(i + 1), String(i + 1))));
        select.value = String(Math.min(previous, count));
        element('invites').replaceChildren(...Array.from({ length: count }, (_, i) => {
            const link = document.createElement('a');
            link.href = `jugar.html?${new URLSearchParams({ juego: game, sala: room, jugador: i + 1 })}`;
            link.target = '_blank';
            link.rel = 'noopener';
            link.textContent = `Abrir o compartir tablero · ${playerName(i + 1)}`;
            return link;
        }));
    }

    function currentSeat() {
        if (guest) return guestSeat;
        if (game === 'cuatro') return state.siguienteJugador;
        return Number(element('seat').value || 1);
    }

    function ready() {
        return started && state && !state.resultado && currentSeat() <= count &&
            (!guest || (online && performance.now() - lastState < 2300)) &&
            (game !== 'cuatro' || currentSeat() === state.siguienteJugador);
    }

    function heldFor(seat) {
        const result = new Set();
        for (const hold of liveControls.values()) if (hold.seat === seat) result.add(hold.action);
        if (!guest) {
            for (const [key, remote] of remoteInputs) {
                if (performance.now() > remote.expires) {
                    remoteInputs.delete(key);
                } else if (remote.seat === seat) {
                    for (const action of remote.buttons) result.add(action);
                }
            }
        }
        return result;
    }

    function setNetwork(message) {
        element('network-status').textContent = message;
    }

    function showPacket(id, packet) {
        const node = element(id);
        const json = JSON.stringify(packet, null, 2);
        if (node.textContent !== json) node.textContent = json;
    }

    function emitControl(seat, control) {
        if (!ready()) return;
        const packet = { partida, jugador: seat, cliente: clientId, secuencia: ++packetSequence, ...control };
        if ('accion' in control && Number.isInteger(state.turno)) packet.turno = state.turno;
        if ('accion' in control && Number.isInteger(state.ronda)) packet.ronda = state.ronda;
        if (!guest) {
            if (packet.accion) applyAction(packet);
            return;
        }
        mqttClient.publish(controlTopic, JSON.stringify(packet), { qos: packet.accion ? 1 : 0 });
        showPacket('last-control', packet);
    }

    function applyAction(packet) {
        if (game === 'memoria' && packet.ronda !== state.ronda) return;
        definition.press?.(state, packet.jugador, packet.accion, packet);
        refreshView();
        publishState();
    }

    function acceptControl(packet) {
        if (!started || state.resultado || packet?.partida !== partida ||
            !Number.isInteger(packet.jugador) || packet.jugador < 1 || packet.jugador > count ||
            typeof packet.cliente !== 'string' || !/^[a-f0-9]{16}$/.test(packet.cliente) ||
            !Number.isSafeInteger(packet.secuencia) || packet.secuencia < 1) return;
        const valid = definition.controls(packet.jugador);
        const action = valid.find(item => !item.hold && item.id === packet.accion);
        const validButtons = Array.isArray(packet.botones) && packet.botones.length <= 4 &&
            packet.botones.every(button => valid.some(item => item.hold && item.id === button));
        if (!action && !validButtons) return;
        const key = `${packet.jugador}/${packet.cliente}`;
        const stream = action ? `${key}/accion` : `${key}/nivel`;
        if ((seen.get(stream) ?? 0) >= packet.secuencia) return;
        if (seen.size >= 128 && !seen.has(stream)) return;
        seen.set(stream, packet.secuencia);
        if (action) applyAction(packet);
        else remoteInputs.set(key, { seat: packet.jugador, buttons: packet.botones, expires: performance.now() + 420 });
        showPacket('last-control', packet);
    }

    function acceptState(packet) {
        if (!packet || typeof packet !== 'object' || typeof packet.partida !== 'string' ||
            !Number.isSafeInteger(packet.secuencia) || typeof packet.iniciada !== 'boolean' ||
            !Number.isInteger(packet.jugadores) || packet.jugadores < 1 || packet.jugadores > definition.seats ||
            typeof packet.estado?.resultado !== 'string') return;
        if (partida === packet.partida && packet.secuencia <= stateSequence) return;
        const previousSeat = currentSeat();
        // A public broker can contain malformed payloads. Leave the last board visible if the new one cannot be drawn.
        try {
            definition.status(packet.estado, Math.min(guestSeat, packet.jugadores));
            definition.draw(ctx, packet.estado);
        } catch {
            return;
        }
        if (partida !== packet.partida || previousSeat > packet.jugadores) liveControls.clear();
        partida = packet.partida;
        stateSequence = packet.secuencia;
        count = packet.jugadores;
        started = packet.iniciada;
        state = packet.estado;
        lastState = performance.now();
        showPacket('last-state', packet);
        refreshView();
    }

    function publishState() {
        if (!online) return;
        lastPublish = performance.now();
        const packet = { partida, secuencia: ++packetSequence, jugadores: count, iniciada: started,
            estado: definition.snapshot ? definition.snapshot(state) : state };
        mqttClient.publish(stateTopic, JSON.stringify(packet), { qos: 0 });
        showPacket('last-state', packet);
    }

    async function connectGame() {
        setNetwork('Conectando con HiveMQ…');
        try {
            const mqtt = await loadMqtt();
            mqttClient = mqtt.connect(DEFAULT_BROKER, { connectTimeout: 5500, reconnectPeriod: 1800, queueQoSZero: false });
            const topic = guest ? stateTopic : controlTopic;
            mqttClient.on('connect', () => mqttClient.subscribe(topic, { qos: guest ? 0 : 1 }, (error, granted) => {
                online = !error && Number.isInteger(granted?.[0]?.qos) && granted[0].qos < 3;
                setNetwork(online ? 'Conectado a HiveMQ.' : 'El broker rechazó la suscripción.');
                if (!guest) publishState();
                refreshView();
            }));
            mqttClient.on('message', (incoming, payload, packet) => {
                if (incoming !== topic || packet.retain || payload.length > 8192) return;
                let value;
                try { value = JSON.parse(payload.toString()); } catch { return; }
                if (guest) acceptState(value);
                else acceptControl(value);
            });
            mqttClient.on('close', () => {
                online = false;
                liveControls.clear();
                remoteInputs.clear();
                setNetwork(guest ? 'Reconectando con HiveMQ…' : 'Reconectando con HiveMQ. Puedes seguir jugando en esta pantalla.');
                refreshView();
            });
            mqttClient.on('error', () => setNetwork('HiveMQ no está disponible ahora.'));
        } catch {
            setNetwork(guest ? 'No se pudo cargar MQTT. Recarga el tablero para reintentar.'
                : 'MQTT no está disponible. Puedes jugar en esta pantalla.');
        }
    }

    function refreshView() {
        const available = Boolean(ready());
        element('board').hidden = !started;
        element('game-cover').hidden = started;
        let readout = guest ? 'Esperando partida del anfitrión' : 'Partida sin iniciar';
        const connected = !guest || (online && performance.now() - lastState < 2300);
        if (guest && !connected && state) readout = 'Esperando que vuelva el anfitrión';
        else if (guest && currentSeat() > count && state) readout = 'Este puesto no está en la partida';
        else if (started && state) readout = state.resultado || definition.status(state, currentSeat());
        if (element('readout').textContent !== readout) element('readout').textContent = readout;
        const pressed = heldFor(currentSeat());
        for (const [action, button] of actions) {
            button.disabled = !available;
            if (button.hasAttribute('aria-pressed')) button.setAttribute('aria-pressed', String(pressed.has(action)));
        }
    }

    function drawControls() {
        actions.clear();
        const buttons = definition.controls(currentSeat()).map(action => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = action.label;
            if (action.hold) {
                button.setAttribute('aria-pressed', 'false');
                button.addEventListener('pointerdown', event => {
                    if (event.button !== 0 || !ready()) return;
                    button.setPointerCapture(event.pointerId);
                    hold(`pointer-${event.pointerId}`, currentSeat(), action.id);
                });
                button.addEventListener('lostpointercapture', event => release(`pointer-${event.pointerId}`));
                button.addEventListener('click', event => {
                    if (event.detail !== 0 || !ready()) return;
                    const token = `keyboard-button-${action.id}`;
                    hold(token, currentSeat(), action.id);
                    setTimeout(() => release(token), 160);
                });
            } else button.addEventListener('click', () => emitControl(currentSeat(), { accion: action.id }));
            actions.set(action.id, button);
            return button;
        });
        element('actions').replaceChildren(...buttons);
        refreshView();
    }

    function hold(key, seat, action) {
        liveControls.set(key, { seat, action });
        emitControl(seat, { botones: [...heldFor(seat)] });
        refreshView();
    }

    function release(key) {
        const pressed = liveControls.get(key);
        if (!pressed) return;
        liveControls.delete(key);
        emitControl(pressed.seat, { botones: [...heldFor(pressed.seat)] });
        refreshView();
    }

    function releaseAll() {
        const seats = new Set([...liveControls.values()].map(value => value.seat));
        liveControls.clear();
        for (const seat of seats) emitControl(seat, { botones: [] });
        refreshView();
    }

    const secondaryKeys = { KeyW: 'ArrowUp', KeyS: 'ArrowDown', KeyA: 'ArrowLeft', KeyD: 'ArrowRight' };
    document.addEventListener('keydown', event => {
        if (!ready() || event.target.closest?.('input,select,textarea') || event.ctrlKey || event.metaKey || event.altKey) return;
        let seat = currentSeat();
        let key = event.code;
        if (!guest && game === 'puente') seat = key.startsWith('Digit') ? 2 : 1;
        if (!guest && (game === 'pong' || game === 'carrera') && Object.hasOwn(secondaryKeys, key)) {
            seat = 2;
            key = secondaryKeys[key];
        } else if (!guest && game === 'pong') seat = 1;
        const action = definition.controls(seat).find(control => control.key === key);
        if (!action) return;
        event.preventDefault();
        if (event.repeat && (action.hold || game !== 'laberinto')) return;
        if (action.hold) hold(event.code, seat, action.id);
        else emitControl(seat, { accion: action.id });
    });
    document.addEventListener('keyup', event => release(event.code));
    window.addEventListener('blur', releaseAll);
    document.addEventListener('visibilitychange', () => { if (document.hidden) releaseAll(); });
    element('seat').addEventListener('change', () => { releaseAll(); drawControls(); });
    element('seat-count').addEventListener('change', () => {
        if (started && !state.resultado) return;
        count = Number(element('seat-count').value);
        started = false;
        partida = randomId();
        state = definition.create(count);
        liveControls.clear();
        remoteInputs.clear();
        seen.clear();
        element('begin').textContent = 'Empezar partida';
        refreshSeats();
        drawControls();
    });

    element('start-form').addEventListener('submit', event => {
        event.preventDefault();
        const attempts = game === 'laberinto' && started ? state.intentos + 1 : 1;
        partida = randomId();
        state = definition.create(count);
        if (game === 'laberinto') state.intentos = attempts;
        started = true;
        liveControls.clear();
        remoteInputs.clear();
        seen.clear();
        element('seat-count').disabled = true;
        element('begin').textContent = 'Reiniciar partida';
        drawControls();
        publishState();
    });

    function paint() {
        definition.draw(ctx, state);
        requestAnimationFrame(paint);
    }

    function advance() {
        const now = performance.now();
        let remaining = Math.min((now - lastTick) / 1000, 1.05);
        lastTick = now;
        while (started && !state.resultado && definition.tick && remaining > 0) {
            const step = Math.min(remaining, .025);
            definition.tick(state, step, heldFor);
            remaining -= step;
        }
        if (now - lastPublish >= 100) {
            lastPublish = now;
            refreshView();
            publishState();
        }
        if (state.resultado) element('seat-count').disabled = false;
    }

    refreshSeats();
    drawControls();
    if (!guest) {
        requestAnimationFrame(paint);
        setInterval(advance, 20);
    } else {
        panel(ctx, SKY);
        label(ctx, 'Esperando al anfitrión', 235, 205, 23);
        setInterval(() => {
            if (ready() && liveControls.size) emitControl(guestSeat, { botones: [...heldFor(guestSeat)] });
            refreshView();
        }, 110);
    }
    connectGame();
}

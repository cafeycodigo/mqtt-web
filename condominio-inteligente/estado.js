const condo = (() => {
    const storageKey = 'laboratorio-mqtt/condominio/demo-v1';
    const operator = 'Operador de prueba · Panel web';
    const deliveryTimeout = 8_000;
    const people = {
        camila: { name: 'Camila Rojas', nfc: 'NFC-014', remote: 'RF-014' },
        mateo: { name: 'Mateo Díaz', nfc: 'NFC-008', remote: 'RF-008' },
        paula: { name: 'Paula Silva', nfc: 'NFC-021', remote: 'RF-021' },
    };
    const entries = {
        gate: { name: 'Portón vehicular', method: 'remote' },
        a: { name: 'Acceso peatonal A', method: 'nfc' },
        b: { name: 'Acceso peatonal B', method: 'nfc' },
    };
    const sectors = {
        norte: { name: 'Norte', location: 'Fachada principal', sensor: 'PIR-01' },
        poniente: { name: 'Poniente', location: 'Costado de estacionamientos', sensor: 'PIR-04' },
        oriente: { name: 'Oriente', location: 'Cierre junto a jardines', sensor: 'PIR-02' },
        sur: { name: 'Sur', location: 'Cierre posterior', sensor: 'PIR-03' },
    };
    const lights = {
        entrance: 'Entrada principal',
        paths: 'Pasillos y senderos',
        parking: 'Estacionamientos',
    };
    const solar = {
        powerKw: 3.1,
        batteryPercent: 76,
        hourlyKwh: [
            ['08:00', 1.2], ['09:00', 2.6], ['10:00', 4.6], ['11:00', 5.8], ['12:00', 5.7], ['13:00', 4.7],
        ],
    };

    function identity(person, method) {
        const credential = method === 'remote' ? `Control ${person.remote}` : person.nfc;
        return `${person.name} · ${credential}`;
    }

    function event(kind, title, detail, time = Date.now()) {
        return { kind, title, detail, time };
    }

    function uniqueId() {
        return crypto.randomUUID?.()
            ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), (part) => part.toString(16).padStart(8, '0')).join('');
    }

    function seed() {
        const minutesAgo = (minutes) => Date.now() - minutes * 60_000;
        const gate = { actor: identity(people.camila, 'remote'), time: minutesAgo(8) };
        const a = { actor: identity(people.mateo, 'nfc'), time: minutesAgo(17) };
        const b = { actor: identity(people.paula, 'nfc'), time: minutesAgo(1) };
        const alertTime = minutesAgo(2);

        return {
            entries: {
                gate: { open: false, last: gate },
                a: { open: false, last: a },
                b: { open: true, last: b },
            },
            alerts: { oriente: { time: alertTime, reviewed: false } },
            lights: { entrance: true, paths: true, parking: false },
            reportEndpoint: '',
            reports: [],
            generalAlarm: null,
            events: [
                event('access', 'Acceso peatonal B abierto', b.actor, b.time),
                event('alarm', 'Movimiento en sector Oriente', 'Cierre junto a jardines · PIR-02', alertTime),
                event('access', 'Portón vehicular abierto', gate.actor, gate.time),
                event('access', 'Acceso peatonal A abierto', a.actor, a.time),
            ],
        };
    }

    function read() {
        try {
            const saved = JSON.parse(localStorage.getItem(storageKey));
            if (saved?.entries && saved.alerts && saved.lights && Array.isArray(saved.events)) {
                return { reportEndpoint: '', reports: [], generalAlarm: null, ...saved };
            }
        } catch {}
        return null;
    }

    function write(next) {
        try {
            localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {}
    }

    const initial = read();
    let state = initial ?? seed();
    if (!initial) write(state);
    const listeners = new Set();

    function notify() {
        listeners.forEach((listener) => listener(state));
    }

    window.addEventListener('storage', (change) => {
        if (change.key !== storageKey) return;
        const updated = read();
        if (updated) {
            state = updated;
            notify();
        }
    });

    function dispatch(change, log = true) {
        const commit = () => {
            const latest = read() ?? state;
            const activity = change(latest);
            if (activity) {
                if (log) {
                    latest.events.unshift(activity);
                    latest.events.length = Math.min(latest.events.length, 120);
                }
                write(latest);
            }
            state = latest;
            notify();
            return activity;
        };
        if (location.protocol !== 'file:' && navigator.locks) {
            return navigator.locks.request(storageKey, commit);
        }
        return Promise.resolve().then(commit);
    }

    function changeAccess(state, id, open, actor) {
        const entry = state.entries[id];
        if (entry.open === open) return null;
        const activity = event('access', `${entries[id].name} ${open ? 'abierto' : 'cerrado'}`, actor);
        entry.open = open;
        if (open) entry.last = { actor, time: activity.time };
        return activity;
    }

    function createReport(id, time) {
        const sector = sectors[id];
        return {
            payload: {
                version: 1,
                id: uniqueId(),
                type: 'alarma.perimetral.movimiento',
                source: 'condominio-inteligente',
                simulation: true,
                detectedAt: new Date(time).toISOString(),
                sector: { id, name: sector.name, location: sector.location },
                sensor: sector.sensor,
            },
            status: 'pending',
            attempts: 0,
        };
    }

    async function deliverReport(id) {
        const request = await dispatch((state) => {
            const report = state.reports.find(({ payload }) => payload.id === id);
            if (!state.reportEndpoint || !report || report.status === 'sent') return null;
            if (report.status === 'sending' && Date.now() - report.startedAt < deliveryTimeout) return null;
            report.status = 'sending';
            report.attempts += 1;
            report.startedAt = Date.now();
            report.detail = '';
            return { endpoint: state.reportEndpoint, attempt: report.attempts, payload: report.payload };
        }, false);
        if (!request) return null;

        let accepted = false;
        let detail;
        try {
            const response = await fetch(request.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request.payload),
                credentials: 'omit',
                redirect: 'error',
                signal: AbortSignal.timeout(deliveryTimeout),
            });
            accepted = response.ok;
            detail = `HTTP ${response.status}`;
        } catch (error) {
            detail = error.name === 'TimeoutError' ? 'Tiempo de espera agotado' : 'No se pudo acceder al receptor';
        }

        return dispatch((state) => {
            const report = state.reports.find(({ payload }) => payload.id === id);
            if (!report || report.attempts !== request.attempt) return null;
            report.status = accepted ? 'sent' : 'error';
            report.detail = detail;
            const action = accepted ? 'Reporte aceptado' : 'Falló el envío del reporte';
            return event('report', `${action} · Sector ${report.payload.sector.name}`, detail);
        }, true);
    }

    function saveEndpoint(value) {
        let endpoint = '';
        if (value) {
            try {
                const url = new URL(value);
                if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error();
                url.hash = '';
                endpoint = url.href;
            } catch {
                return Promise.reject(new Error('Ingresa una URL HTTP o HTTPS sin usuario ni contraseña.'));
            }
        }
        return dispatch((state) => {
            if (state.reportEndpoint === endpoint) return null;
            state.reportEndpoint = endpoint;
            return event('report', endpoint ? 'Destino de reportes configurado' : 'Envío automático desactivado', operator);
        }, true);
    }

    const commands = {
        setAccess: (id, open) => dispatch((state) => changeAccess(state, id, open, operator)),
        simulateAccess: (id, personId) => dispatch((state) => {
            const entry = entries[id];
            if (!Object.hasOwn(people, personId)) {
                const method = entry.method === 'remote' ? 'Control RF' : 'NFC';
                return event('access', `Acceso denegado · ${entry.name}`, `${method} · Credencial sin asignar`);
            }
            const actor = identity(people[personId], entry.method);
            return changeAccess(state, id, true, actor)
                ?? event('access', `Credencial usada con ${entry.name.toLowerCase()} abierto`, actor);
        }),
        setLight: (id, on) => dispatch((state) => {
            if (state.lights[id] === on) return null;
            state.lights[id] = on;
            return event('light', `${lights[id]} · ${on ? 'Encendida' : 'Apagada'}`, operator);
        }),
        lightsOff: () => dispatch((state) => {
            if (Object.values(state.lights).every((on) => !on)) return null;
            Object.keys(lights).forEach((id) => { state.lights[id] = false; });
            return event('light', 'Se apagaron todas las zonas', operator);
        }),
        review: (id) => dispatch((state) => {
            const alert = state.alerts[id];
            if (!alert || alert.reviewed) return null;
            alert.reviewed = true;
            return event('alarm', `Alerta revisada en sector ${sectors[id].name}`, operator);
        }),
        sendGeneralAlarm: (message) => {
            const text = message.trim();
            if (!text) return Promise.reject(new Error('Escribe un mensaje antes de enviar la alarma.'));
            return dispatch((state) => {
                const alarm = { id: uniqueId(), message: text, time: Date.now() };
                state.generalAlarm = alarm;
                return event('general', 'Alarma general enviada', text, alarm.time);
            });
        },
        simulateAlarm: (id, signal) => dispatch((state) => {
            const sector = sectors[id];
            const detail = `${sector.location} · ${sector.sensor}`;
            if (signal === 'motion') {
                const activity = event('alarm', `Movimiento en sector ${sector.name}`, detail);
                state.alerts[id] = { time: activity.time, reviewed: false };
                const report = createReport(id, activity.time);
                activity.reportId = report.payload.id;
                state.reports.unshift(report);
                state.reports.length = Math.min(state.reports.length, 30);
                return activity;
            }
            if (!state.alerts[id]) return null;
            delete state.alerts[id];
            return event('alarm', `Sector ${sector.name} restablecido`, detail);
        }).then((activity) => {
            if (activity?.reportId) deliverReport(activity.reportId).catch((error) => console.error('Reporte de alarma:', error));
            return activity;
        }),
        saveEndpoint,
        deliverReport,
    };

    return {
        people, entries, sectors, lights, solar, identity, commands,
        subscribe(listener) {
            listeners.add(listener);
            listener(state);
        },
    };
})();

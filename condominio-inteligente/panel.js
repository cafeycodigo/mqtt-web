const $ = (id) => document.getElementById(id);
const { people, entries, sectors, lights, solar, commands } = condo;
const isControl = document.body.dataset.view === 'control';
const number = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 });
const clock = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
const dayClock = new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
const eventLabels = { access: 'Acceso', alarm: 'Perímetro', general: 'Alarma general', light: 'Iluminación', report: 'Reporte' };
const deliveryLabels = { pending: 'Pendiente', sending: 'Enviando', sent: 'Aceptado', error: 'Falló' };
let selectedSector = 'oriente';
let snapshot;
let renderedEndpoint;
let knownAlertTimes;
let knownGeneralAlarmId;
let hasSeenGeneralAlarm = false;
let toastTimeout;

function showToast(title, message, sector) {
    const toast = $('alarm-toast');
    const location = $('alarm-toast-location');
    $('alarm-toast-title').textContent = title;
    $('alarm-toast-message').textContent = message;
    location.hidden = !sector;
    if (sector) location.dataset.sector = sector;
    toast.dataset.type = sector ? 'perimeter' : 'general';
    toast.classList.remove('alarm-toast-enter');
    void toast.offsetWidth;
    toast.classList.add('alarm-toast-enter');
    toast.hidden = false;
    clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => {
        toast.hidden = true;
    }, 8_000);
}

function showAlarmToast(id) {
    const sector = sectors[id];
    if (sector) showToast('Alerta perimetral', `Movimiento detectado en sector ${sector.name} · ${sector.sensor}`, id);
}

function showGeneralAlarm(alarm) {
    showToast('Alarma general', alarm.message);
    if (!isControl) playAlarmSound();
}

function playAlarmSound() {
    const audio = $('alarm-sound');
    audio.currentTime = 0;
    audio.play().then(() => {
        $('alarm-sound-test').textContent = 'Probar sonido';
        $('alarm-sound-status').textContent = 'Sonido de alarma listo.';
    }).catch((error) => {
        if (error.name === 'NotAllowedError') {
            $('alarm-sound-test').textContent = 'Activar sonido';
            $('alarm-sound-status').textContent = 'El navegador bloqueó el audio. Activa el sonido para oír esta alarma.';
            return;
        }
        $('alarm-sound-status').textContent = 'No se pudo reproducir el sonido de alarma.';
        console.error('Sonido de alarma:', error);
    });
}

function escapeText(value) {
    return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function timeMarkup(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Hora sin registrar';
    const day = dayClock.format(date);
    const time = clock.format(date);
    const label = day === dayClock.format(Date.now()) ? time : `${day} · ${time}`;
    return `<time datetime="${date.toISOString()}" title="${day} · ${time}">${label}</time>`;
}

function normalizeSearch(value) {
    return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es-CL');
}

function renderEvents() {
    const filter = $('event-filter').value;
    const query = normalizeSearch($('event-search').value.trim());
    const filtered = snapshot.events.filter(({ kind, title, detail }) => {
        if (!Object.hasOwn(eventLabels, kind) || (filter !== 'all' && filter !== kind)) return false;
        return !query || normalizeSearch(`${title} ${detail} ${eventLabels[kind]}`).includes(query);
    });
    $('event-count').textContent = `${filtered.length} de ${snapshot.events.length} eventos registrados`;
    $('events').innerHTML = filtered.map(({ kind, title, detail, time }) => `
        <li class="condo-event">
            <div class="min-w-0 break-words">
                <p class="font-semibold">${escapeText(title)}</p>
                <p class="mt-0.5 text-sm text-muted">${escapeText(detail)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs tabular-nums text-muted">
                <span class="event-kind" data-kind="${kind}">${eventLabels[kind]}</span>${timeMarkup(time)}
            </div>
        </li>
    `).join('') || '<li class="py-3 text-sm text-muted">No hay eventos que coincidan con la búsqueda.</li>';
}

function renderAccess() {
    const list = $('access-list');
    const focused = list.contains(document.activeElement) && document.activeElement.dataset.entry;
    list.innerHTML = Object.entries(entries).map(([id, entry]) => {
        const { open, last } = snapshot.entries[id];
        const action = open ? 'Cerrar' : 'Abrir';
        return `
            <div class="access-row">
                <div class="min-w-0">
                    <h3 class="text-sm font-semibold">${entry.name} <span class="ml-1 text-xs font-medium text-muted">${entry.method === 'remote' ? 'RF' : 'NFC'}</span></h3>
                    <p class="mt-1 break-words text-sm text-muted">${escapeText(last.actor)}</p>
                    <p class="text-xs text-muted">Última apertura · ${timeMarkup(last.time)}</p>
                </div>
                <div class="flex items-center gap-2">
                    <span class="access-tag" data-open="${open === true}">${open ? 'Abierto' : 'Cerrado'}</span>
                    ${isControl && (open || id === 'gate') ? `
                        <button type="button" class="btn ${open ? '' : 'btn-primary'}" data-entry="${id}" data-target="${!open}" aria-label="${action} ${entry.name.toLowerCase()}">${action}</button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
    if (focused) (list.querySelector(`[data-entry="${focused}"]`) ?? $('access-title')).focus({ preventScroll: true });
}

function renderPerimeter() {
    const active = Object.keys(snapshot.alerts).length;
    $('alert-count').textContent = active === 0 ? 'Sin alertas' : `${active} ${active === 1 ? 'alerta activa' : 'alertas activas'}`;
    $('alert-count').dataset.active = active > 0;

    for (const button of $('sector-list').querySelectorAll('button')) {
        const alert = snapshot.alerts[button.dataset.sector];
        button.setAttribute('aria-pressed', button.dataset.sector === selectedSector);
        button.dataset.active = Boolean(alert);
        button.lastElementChild.textContent = alert ? 'Movimiento' : 'Normal';
    }

    const sector = sectors[selectedSector];
    const alert = snapshot.alerts[selectedSector];
    const detail = alert
        ? `Movimiento detectado · ${timeMarkup(alert.time)} · ${alert.reviewed ? 'Revisada' : 'Por revisar'}`
        : 'Sin señales de alarma activas';
    $('sector-detail').innerHTML = `
        <p class="text-sm font-semibold">${sector.name} · ${sector.location}</p>
        <p class="mt-1 text-xs text-soft">${sector.sensor} · ${detail}</p>
    `;
    maqueta.render(snapshot, selectedSector);

    if (isControl) {
        const button = $('acknowledge');
        const focused = document.activeElement === button;
        button.hidden = !alert || alert.reviewed;
        if (button.hidden && focused) {
            $('sector-list').querySelector(`[data-sector="${selectedSector}"]`).focus({ preventScroll: true });
        }
    }
}

function renderReports() {
    if (isControl) {
        if (snapshot.reportEndpoint !== renderedEndpoint) {
            renderedEndpoint = snapshot.reportEndpoint;
            $('report-endpoint').value = renderedEndpoint;
            $('report-config-result').textContent = renderedEndpoint
                ? 'Envío automático activado para nuevas alertas.'
                : 'Configura un destino para enviar los reportes.';
        }
        $('disable-reporting').disabled = !snapshot.reportEndpoint;
    } else {
        const accepted = snapshot.reports.filter(({ status }) => status === 'sent').length;
        const failed = snapshot.reports.filter(({ status }) => status === 'error').length;
        const pending = snapshot.reports.length - accepted - failed;
        $('report-summary').textContent = `${accepted} aceptados · ${pending} en cola o en envío · ${failed} con error`;
        $('receiver-status').textContent = snapshot.reportEndpoint ? 'Destino configurado' : 'Sin destino';
    }

    const list = $('report-list');
    const focused = list.contains(document.activeElement) && document.activeElement.dataset.report;
    const reports = isControl ? snapshot.reports.slice(0, 6) : snapshot.reports;
    list.innerHTML = reports.map(({ payload, status, detail, attempts }) => {
        if (!/^[0-9a-f-]{30,50}$/i.test(payload.id) || !Object.hasOwn(deliveryLabels, status)) return '';
        return `
            <li class="condo-event">
                <div class="min-w-0 break-words">
                    <p class="font-semibold">Sector ${escapeText(payload.sector.name)} · ${escapeText(payload.sensor)}</p>
                    <p class="text-xs text-muted">${timeMarkup(payload.detectedAt)}${attempts ? ` · Intentos: ${escapeText(attempts)}` : ''}${detail ? ` · ${escapeText(detail)}` : ''}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="event-kind report-state" data-state="${status}">${deliveryLabels[status]}</span>
                    ${isControl && status !== 'sent' ? `<button type="button" class="btn" data-report="${payload.id}" ${snapshot.reportEndpoint ? '' : 'disabled'}>${attempts ? 'Reintentar' : 'Enviar'}</button>` : ''}
                </div>
            </li>
        `;
    }).join('') || '<li class="py-3 text-sm text-muted">Simula movimiento en un sector para crear un reporte.</li>';
    if (focused) {
        (list.querySelector(`[data-report="${focused}"]:enabled`) ?? $('report-title')).focus({ preventScroll: true });
    }
}

function renderActiveAlerts() {
    const list = $('active-alerts');
    const focused = list.contains(document.activeElement) && document.activeElement.dataset.locate;
    const active = Object.entries(snapshot.alerts)
        .filter(([id]) => Object.hasOwn(sectors, id))
        .sort(([, a], [, b]) => Number(a.reviewed) - Number(b.reviewed) || b.time - a.time);
    list.innerHTML = active.map(([id, alert]) => {
        const { name, sensor, location } = sectors[id];
        return `
            <li class="condo-event">
                <div class="min-w-0">
                    <p class="font-semibold">${name} · ${sensor}</p>
                    <p class="text-xs text-muted">${location} · ${timeMarkup(alert.time)}</p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <span class="event-kind" data-kind="${alert.reviewed ? '' : 'alarm'}">${alert.reviewed ? 'Revisada' : 'Por revisar'}</span>
                    <a href="#seguridad" class="alert-location" data-locate="${id}" aria-label="Ubicar sector ${name} en el mapa">Ubicar</a>
                </div>
            </li>
        `;
    }).join('') || '<li class="py-3 text-sm text-muted">Sin señales de alarma activas.</li>';
    if (focused) (list.querySelector(`[data-locate="${focused}"]`) ?? $('alarms-title')).focus({ preventScroll: true });
}

function renderLights() {
    const list = $('light-list');
    const focused = list.contains(document.activeElement) && document.activeElement.dataset.light;
    const count = Object.values(snapshot.lights).filter(Boolean).length;
    $('light-count').textContent = `${count} de ${Object.keys(lights).length} zonas encendidas`;
    list.innerHTML = Object.entries(lights).map(([id, name]) => {
        const on = snapshot.lights[id];
        return `
            <div class="light-row">
                <h3 class="text-sm font-semibold">${name}</h3>
                <div class="flex items-center gap-2">
                    <span class="light-state" data-on="${on === true}">${on ? 'Encendida' : 'Apagada'}</span>
                    ${isControl ? `<button type="button" class="btn" data-light="${id}" data-target="${!on}" aria-label="${on ? 'Apagar' : 'Encender'} ${name.toLowerCase()}">${on ? 'Apagar' : 'Encender'}</button>` : ''}
                </div>
            </div>
        `;
    }).join('');
    if (focused) list.querySelector(`[data-light="${focused}"]`).focus({ preventScroll: true });
    if (isControl) {
        const allOff = $('lights-off');
        const wasFocused = document.activeElement === allOff;
        allOff.disabled = count === 0;
        if (allOff.disabled && wasFocused) list.querySelector('button').focus({ preventScroll: true });
    }
}

function renderSummary() {
    const active = Object.keys(snapshot.alerts).length;
    const pending = Object.values(snapshot.alerts).filter((alert) => !alert.reviewed).length;
    const gate = snapshot.entries.gate.open;
    const open = Object.values(snapshot.entries).filter((entry) => entry.open).length;
    const latest = snapshot.events[0];
    const unresolved = snapshot.reports.filter(({ status }) => status !== 'sent').length;
    const failed = snapshot.reports.filter(({ status }) => status === 'error').length;
    const tiles = [
        ['#actividad', 'Último evento', latest ? timeMarkup(latest.time) : '—', latest?.title ?? 'Sin actividad', false],
        ['#accesos', 'Portón vehicular', gate ? 'Abierto' : 'Cerrado', `${open} de ${Object.keys(entries).length} accesos abiertos`, gate],
        ['#alertas', 'Alertas perimetrales', active, pending ? `${pending} por revisar` : active ? 'Revisadas' : 'Sin alertas', active > 0],
        ['#reportes', 'Reportes sin confirmar', unresolved, failed ? `${failed} con error` : 'Ver estado de entregas', unresolved > 0],
    ];
    const summary = $('condo-summary');
    const focused = summary.contains(document.activeElement) && document.activeElement.getAttribute('href');
    summary.innerHTML = tiles.map(([url, label, value, detail, attention]) => `
        <a href="${url}" class="condo-metric" data-attention="${attention}">
            <span class="text-xs font-semibold text-muted">${label}</span>
            <strong>${value}</strong>
            <span class="break-words text-xs text-muted">${escapeText(detail)}</span>
        </a>
    `).join('');
    if (focused) summary.querySelector(`[href="${focused}"]`)?.focus({ preventScroll: true });
}

function renderSolar() {
    const generated = solar.hourlyKwh.reduce((total, [, value]) => total + value, 0);
    const readings = [['Potencia actual', solar.powerKw, 'kW'], ['Generación hoy', generated, 'kWh'], ['Batería de respaldo', solar.batteryPercent, '%']];
    $('solar-readings').innerHTML = readings.map(([label, value, unit]) => `
        <div><dt class="stat-label">${label}</dt><dd class="stat-value">${number.format(value)} <span class="text-sm font-medium">${unit}</span></dd></div>
    `).join('');
    const max = Math.max(...solar.hourlyKwh.map(([, value]) => value));
    $('solar-chart').innerHTML = solar.hourlyKwh.map(([hour, value]) => `
        <div class="solar-bar" title="${hour} · ${number.format(value)} kWh" style="--bar-height: ${value / max * 100}%">
            <span aria-hidden="true"></span><span>${hour}<span class="sr-only"> · ${number.format(value)} kWh</span></span>
        </div>
    `).join('');
}

function updatePeople() {
    const entry = entries[$('sim-entry').value];
    const select = $('sim-person');
    const previous = select.value;
    select.innerHTML = Object.entries(people).map(([id, person]) =>
        `<option value="${id}">${condo.identity(person, entry.method)}</option>`
    ).join('') + '<option value="unknown">Credencial sin asignar</option>';
    if (previous) select.value = previous;
}

async function report(action, simulation = false) {
    let message;
    try {
        const activity = await action;
        message = activity?.title ?? 'El estado ya estaba actualizado';
    } catch {
        message = 'La acción no se pudo aplicar. Inténtalo de nuevo.';
    }
    $('command-result').textContent = message;
    if (simulation) $('simulation-result').textContent = message;
}

function bindControls() {
    $('sim-entry').innerHTML = Object.entries(entries).map(([id, entry]) => `<option value="${id}">${entry.name}</option>`).join('');
    $('sim-sector').innerHTML = Object.entries(sectors).map(([id, sector]) => `<option value="${id}">${sector.name} · ${sector.sensor}</option>`).join('');
    $('sim-entry').addEventListener('change', updatePeople);
    updatePeople();

    $('acknowledge').addEventListener('click', () => report(commands.review(selectedSector)));
    $('lights-off').addEventListener('click', () => report(commands.lightsOff()));
    $('access-list').addEventListener('click', (event) => {
        const button = event.target.closest('[data-entry]');
        if (button) report(commands.setAccess(button.dataset.entry, button.dataset.target === 'true'));
    });
    $('light-list').addEventListener('click', (event) => {
        const button = event.target.closest('[data-light]');
        if (button) report(commands.setLight(button.dataset.light, button.dataset.target === 'true'));
    });
    $('simulate-access').addEventListener('submit', (event) => {
        event.preventDefault();
        report(commands.simulateAccess($('sim-entry').value, $('sim-person').value), true);
    });
    $('simulate-alarm').addEventListener('submit', (event) => {
        event.preventDefault();
        selectedSector = $('sim-sector').value;
        report(commands.simulateAlarm(selectedSector, $('sim-signal').value), true);
    });
    $('report-config').addEventListener('submit', (event) => {
        event.preventDefault();
        setReportEndpoint($('report-endpoint').value.trim());
    });
    $('general-alarm-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const message = $('general-alarm-message').value.trim();
        const button = $('general-alarm-form').querySelector('[type="submit"]');
        if (!message) {
            $('general-alarm-result').textContent = 'Escribe un mensaje antes de enviar la alarma.';
            return;
        }
        button.disabled = true;
        try {
            await commands.sendGeneralAlarm(message);
            $('general-alarm-message').value = '';
            $('general-alarm-result').textContent = 'Alarma general enviada al tablero.';
        } catch (error) {
            $('general-alarm-result').textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });
    $('disable-reporting').addEventListener('click', () => setReportEndpoint(''));
    $('report-list').addEventListener('click', async (event) => {
        const button = event.target.closest('[data-report]');
        if (!button) return;
        try {
            const result = await commands.deliverReport(button.dataset.report);
            $('command-result').textContent = result?.title ?? 'El envío ya está en curso o fue aceptado.';
        } catch {
            $('command-result').textContent = 'El reporte no se pudo procesar.';
        }
    });
}

async function setReportEndpoint(value) {
    try {
        const activity = await commands.saveEndpoint(value);
        $('report-config-result').textContent = snapshot.reportEndpoint
            ? 'Envío automático activado para nuevas alertas.'
            : 'Configura un destino para enviar los reportes.';
        $('command-result').textContent = activity?.title ?? 'El destino no cambió.';
    } catch (error) {
        $('report-config-result').textContent = error.message;
    }
}

function selectSector(sector) {
    if (!sector || sector === selectedSector) return;
    selectedSector = sector;
    renderPerimeter();
}

$('local-hint').hidden = location.protocol !== 'file:';
$('alarm-toast-dismiss').addEventListener('click', () => {
    $('alarm-toast').hidden = true;
    clearTimeout(toastTimeout);
});
$('alarm-toast-location').addEventListener('click', (event) => {
    selectSector(event.currentTarget.dataset.sector);
});
if (!isControl) $('alarm-sound-test').addEventListener('click', playAlarmSound);
$('sector-list').innerHTML = Object.entries(sectors).map(([id, sector]) => `
    <button class="sector-button" type="button" data-sector="${id}" aria-pressed="false">
        <span class="font-semibold">${sector.name}</span><span></span>
    </button>
`).join('');
$('sector-list').addEventListener('click', (event) => {
    selectSector(event.target.closest('[data-sector]')?.dataset.sector);
});
$('world').addEventListener('click', (event) => selectSector(event.target.closest('[data-beacon]')?.dataset.beacon));

if (isControl) bindControls();
else {
    $('event-filter').addEventListener('change', renderEvents);
    $('event-search').addEventListener('input', renderEvents);
    $('active-alerts').addEventListener('click', (event) => {
        selectSector(event.target.closest('[data-locate]')?.dataset.locate);
    });
    renderSolar();
}

condo.subscribe((state) => {
    if (knownAlertTimes) {
        for (const [id, alert] of Object.entries(state.alerts)) {
            if (knownAlertTimes[id] !== alert.time) showAlarmToast(id);
        }
    }
    knownAlertTimes = Object.fromEntries(Object.entries(state.alerts).map(([id, alert]) => [id, alert.time]));
    if (hasSeenGeneralAlarm && state.generalAlarm && knownGeneralAlarmId !== state.generalAlarm.id) {
        showGeneralAlarm(state.generalAlarm);
    }
    knownGeneralAlarmId = state.generalAlarm?.id;
    hasSeenGeneralAlarm = true;
    snapshot = state;
    renderAccess();
    renderPerimeter();
    renderLights();
    renderReports();
    if (!isControl) {
        renderActiveAlerts();
        renderSummary();
        renderEvents();
    }
});

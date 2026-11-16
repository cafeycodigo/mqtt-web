const maqueta = (() => {
    const host = document.getElementById('world');
    let angle = -35;
    let viewpoint = 0;
    const directions = ['Norte', 'Oriente', 'Sur', 'Poniente'];

    host.innerHTML = `
        <figure class="world">
            <figcaption class="world-hud">
                <span class="world-title"><span class="world-dot" aria-hidden="true"></span> Maqueta 3D</span>
                <button type="button" class="world-turn" aria-label="Girar la maqueta">Girar vista <span aria-hidden="true">↻</span></button>
            </figcaption>
            <div class="world-stage" role="group" aria-label="Balizas del mapa 3D">
                <div class="world-board">
                    <div class="world-foundation"></div>
                    <div class="world-road"></div>
                    <div class="world-garden"></div>
                    <div class="world-parking"></div>
                    <div class="world-building tower-a"><i></i><i></i><i></i><i></i><i class="world-roof"></i></div>
                    <div class="world-building tower-b"><i></i><i></i><i></i><i></i><i class="world-roof world-solar"></i></div>
                    <div class="world-building lodge"><i></i><i></i><i></i><i></i><i class="world-roof"></i></div>
                    <span class="world-gate"></span>
                    <span class="world-door door-a"></span><span class="world-door door-b"></span>
                    <span class="world-lamp lamp-entrance"></span><span class="world-lamp lamp-path"></span><span class="world-lamp lamp-parking"></span>
                    ${Object.entries(condo.sectors).map(([id, sector]) =>
                        `<button type="button" class="world-beacon beacon-${id}" data-beacon="${id}" aria-label="Sector ${sector.name}" aria-pressed="false"></button>`
                    ).join('')}
                </div>
            </div>
            <div class="world-caption">
                <span class="world-facing" aria-live="polite">Vista Norte</span>
                <span><i class="world-key-alert" aria-hidden="true"></i> Alerta</span>
                <span><i class="world-key-access" aria-hidden="true"></i> Acceso</span>
                <span><i class="world-key-solar" aria-hidden="true"></i> Solar</span>
            </div>
        </figure>
    `;

    const board = host.querySelector('.world-board');
    const beacons = host.querySelectorAll('[data-beacon]');

    host.querySelector('.world-turn').addEventListener('click', () => {
        angle += 90;
        viewpoint = (viewpoint + 1) % directions.length;
        board.style.setProperty('--view-angle', `${angle}deg`);
        host.querySelector('.world-facing').textContent = `Vista ${directions[viewpoint]}`;
    });

    return {
        render(state, selected) {
            for (const beacon of beacons) {
                beacon.dataset.active = Boolean(state.alerts[beacon.dataset.beacon]);
                beacon.setAttribute('aria-pressed', beacon.dataset.beacon === selected);
            }
            board.dataset.gate = state.entries.gate.open;
            board.dataset.accessA = state.entries.a.open;
            board.dataset.accessB = state.entries.b.open;
            board.dataset.entrance = state.lights.entrance;
            board.dataset.paths = state.lights.paths;
            board.dataset.parking = state.lights.parking;
        },
    };
})();

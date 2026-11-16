const id = new URLSearchParams(location.search).get('juego');
const get = key => document.getElementById(key);

if (Object.hasOwn(proposals, id)) {
    const { title, summary, players, controls, objective, model, input, state, note } = proposals[id];
    document.title = `${title} | Laboratorio MQTT`;
    get('title').textContent = title;
    get('summary').textContent = summary;
    get('summary').hidden = false;
    get('play-link').href = `jugar.html?juego=${id}`;
    get('play-link').hidden = false;
    get('players').textContent = players;
    get('controls').textContent = controls;
    get('objective').textContent = objective;
    get('model-description').textContent = model;
    get('model').setAttribute('aria-label', `Maqueta 3D de ${title}`);
    get('input-topic').textContent = `juegos/${id}/<sala>/control`;
    get('state-topic').textContent = `juegos/${id}/<sala>/estado`;
    get('input-payload').textContent = JSON.stringify({ partida: '…', jugador: 1, cliente: '…', secuencia: 24, ...input }, null, 2);
    const playersInExample = id === 'carrera' ? 4 : ['puente', 'pong', 'cuatro'].includes(id) ? 2 : 1;
    get('state-payload').textContent = JSON.stringify({ partida: '…', secuencia: 39, jugadores: playersInExample, iniciada: true, estado: state }, null, 2);
    get('design-note').textContent = note;
    get('proposal').hidden = false;
    loadViewer();
} else {
    get('missing').hidden = false;
}

async function loadViewer() {
    const status = get('model-status');
    const canvas = get('model');
    const stage = get('stage');
    try {
        const engine = await import('https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.min.js');
        const renderer = new engine.WebGLRenderer({ canvas, antialias: true });
        const scene = new engine.Scene();
        scene.background = new engine.Color(0xdfebe4);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
        renderer.toneMapping = engine.ACESFilmicToneMapping;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = engine.PCFSoftShadowMap;
        renderer.shadowMap.autoUpdate = false;
        renderer.shadowMap.needsUpdate = true;

        const camera = new engine.PerspectiveCamera(35, 1, .1, 120);
        const model = buildModel(engine, id);
        const bounds = new engine.Box3().setFromObject(model).getBoundingSphere(new engine.Sphere());
        scene.add(model);
        const floor = new engine.Mesh(new engine.PlaneGeometry(160, 160),
            new engine.MeshStandardMaterial({ color: 0xdde9df, roughness: .92 }));
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor, new engine.HemisphereLight(0xe5f4ff, 0x63776c, 2.1));
        const key = new engine.DirectionalLight(0xffead2, 3.0);
        key.position.set(-5, 9, 5);
        key.castShadow = true;
        Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, far: 30 });
        key.shadow.camera.updateProjectionMatrix();
        key.shadow.mapSize.set(1024, 1024);
        key.shadow.normalBias = .025;
        scene.add(key);
        const fill = new engine.DirectionalLight(0xbbd8fa, 1.15);
        fill.position.set(5, 4, -6);
        scene.add(fill);

        const defaultView = { turn: .72, elevation: id === 'cuatro' ? .31 : .61, zoom: 1 };
        const view = { ...defaultView };
        function render() {
            const visibleHalfAngle = Math.atan(Math.tan(Math.PI * camera.fov / 360) * Math.min(1, camera.aspect));
            const distance = bounds.radius / Math.sin(visibleHalfAngle) * 1.04 * view.zoom;
            const horizontal = Math.cos(view.elevation) * distance;
            camera.position.copy(bounds.center).add(new engine.Vector3(
                Math.sin(view.turn) * horizontal,
                Math.sin(view.elevation) * distance,
                Math.cos(view.turn) * horizontal
            ));
            camera.lookAt(bounds.center);
            renderer.render(scene, camera);
        }

        function resize() {
            const { clientWidth, clientHeight } = stage;
            if (!clientWidth || !clientHeight) return;
            camera.aspect = clientWidth / clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(clientWidth, clientHeight, false);
            render();
        }

        function rotate(dx, dy) {
            view.turn += dx;
            view.elevation = engine.MathUtils.clamp(view.elevation + dy, .035, Math.PI / 2 - .04);
            render();
        }

        function zoom(factor) {
            view.zoom = engine.MathUtils.clamp(view.zoom * factor, .5, 1.9);
            render();
        }

        let activePointer;
        let previousX;
        let previousY;
        canvas.addEventListener('pointerdown', event => {
            if (event.button !== 0 || activePointer !== undefined) return;
            activePointer = event.pointerId;
            previousX = event.clientX;
            previousY = event.clientY;
            canvas.setPointerCapture(activePointer);
        });
        canvas.addEventListener('pointermove', event => {
            if (event.pointerId !== activePointer) return;
            rotate((previousX - event.clientX) * .008, (event.clientY - previousY) * .008);
            previousX = event.clientX;
            previousY = event.clientY;
        });
        canvas.addEventListener('lostpointercapture', () => { activePointer = undefined; });
        canvas.addEventListener('wheel', event => {
            event.preventDefault();
            zoom(Math.exp(Math.sign(event.deltaY) * .14));
        }, { passive: false });
        const keys = { ArrowLeft: [-.16, 0], ArrowRight: [.16, 0], ArrowUp: [0, .13], ArrowDown: [0, -.13] };
        canvas.addEventListener('keydown', event => {
            const step = keys[event.key];
            if (!Array.isArray(step)) return;
            event.preventDefault();
            rotate(...step);
        });
        get('zoom-in').addEventListener('click', () => zoom(.82));
        get('zoom-out').addEventListener('click', () => zoom(1.22));
        get('reset-view').addEventListener('click', () => {
            Object.assign(view, defaultView);
            render();
        });
        canvas.hidden = false;
        resize();
        const sizeObserver = new ResizeObserver(resize);
        sizeObserver.observe(stage);
        status.hidden = true;
        get('model-controls').hidden = false;
    } catch (error) {
        console.error('No se pudo abrir la maqueta 3D.', error);
        canvas.hidden = true;
        status.textContent = 'La maqueta 3D requiere WebGL y acceso a la biblioteca del visor.';
    }
}

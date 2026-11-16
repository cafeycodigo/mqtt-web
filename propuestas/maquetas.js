function buildModel(THREE, type) {
    const model = new THREE.Group();
    const materials = new Map();
    const metal = { metalness: .36, roughness: .32 };
    const stone = { roughness: .91, flatShading: true };
    const ivory = 0xe7dec7;
    const dark = 0x263634;
    const brass = 0xd4963c;

    function piece(geometry, color, x, y, z, finish = {}) {
        const key = JSON.stringify([color, finish]);
        if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({ color, roughness: .65, ...finish }));
        const mesh = new THREE.Mesh(geometry, materials.get(key));
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        model.add(mesh);
        return mesh;
    }
    const box = (w, h, d, x, y, z, color, finish) => piece(new THREE.BoxGeometry(w, h, d), color, x, y, z, finish);
    const ball = (r, x, y, z, color, finish) => piece(new THREE.SphereGeometry(r, 28, 18), color, x, y, z, finish);
    const column = (r, h, x, y, z, color, finish) => piece(new THREE.CylinderGeometry(r, r, h, 32), color, x, y, z, finish);
    const rock = (r, x, y, z, color) => piece(new THREE.IcosahedronGeometry(r, 0), color, x, y, z, stone);
    const glowing = color => ({ emissive: color, emissiveIntensity: .32, roughness: .35 });

    function maze() {
        box(7.4, .32, 7.4, 0, .16, 0, dark);
        const board = ['#######', '#...#.#', '#.#.#.#', '#.#...#', '#.###.#', '#.....#', '#####.#'];
        board.forEach((row, z) => Array.from(row).forEach((cell, x) => {
            box(.99, .06, .99, x - 3, .34, z - 3, (x + z) % 2 ? ivory : 0xc7bcb0);
            if (cell === '#') {
                box(.98, .58, .98, x - 3, .64, z - 3, 0x4a6b5d);
                box(.96, .055, .96, x - 3, .95, z - 3, 0x789485);
            }
        }));
        column(.3, .21, -2, .46, -2, brass, metal);
        ball(.22, -2, .68, -2, brass, metal);
        box(.7, .07, .7, 2, .4, 3, 0x69c791, glowing(0x54b878));
        column(.035, .73, 2.37, .74, 2.75, dark, metal);
        box(.32, .22, .035, 2.2, .99, 2.75, 0x7dbb6c);
    }

    function orbit() {
        column(3.8, .21, 0, .14, 0, 0x162538);
        const planet = ball(1.12, -1.65, 1.52, -1.05, 0xcb905b);
        planet.scale.y = .9;
        const ring = piece(new THREE.RingGeometry(1.32, 1.94, 80), 0xf5ca93, -1.65, 1.52, -1.05, { side: THREE.DoubleSide });
        ring.rotation.set(-Math.PI / 2.6, .12, 0);
        const ship = piece(new THREE.CylinderGeometry(.03, .46, 2.25, 8), 0xb3c4ce, 1.21, 1.42, .68, metal);
        ship.rotation.x = -Math.PI / 2;
        const canopy = ball(.31, 1.21, 1.65, .55, 0x2e829c, { metalness: .45, roughness: .18 });
        canopy.scale.set(.7, .49, 1.5);
        for (const side of [-1, 1]) {
            const wing = box(.93, .09, .72, 1.21 + side * .5, 1.39, 1.06, 0xb7c0bf, metal);
            wing.rotation.y = side * -.36;
            column(.14, .43, 1.21 + side * .48, 1.38, 1.35, dark, metal).rotation.x = Math.PI / 2;
            ball(.12, 1.21 + side * .48, 1.38, 1.61, 0x5ed7f5, glowing(0x25b6ff));
        }
        [[-2.8, .6, 1.5], [-.4, .62, 1.9], [2.7, .85, -.35], [2, 1.5, -2.15], [-2.9, 1.15, -.9], [2.7, .46, 2]].forEach(([x, y, z], i) => {
            const asteroid = rock(.25 + (i % 3) * .105, x, y, z, i % 2 ? 0x807e7a : 0xa59180);
            asteroid.rotation.set(i * .78, i * .62, .3);
            asteroid.scale.set(1.25, .85, 1);
        });
    }

    function memory() {
        box(5.5, .57, 4.25, 0, .34, 0, dark);
        box(5.2, .075, 3.98, 0, .66, 0, 0x505c5d, metal);
        [[-1.34, -.81, 0x529d70], [1.32, -.81, 0xd5554c], [-1.34, .86, 0xe8b747], [1.32, .86, 0x3f9bb9]].forEach(([x, z, color]) => {
            column(.7, .13, x, .77, z, 0x202629, metal);
            column(.57, .18, x, .89, z, color, glowing(color));
            const cap = ball(.56, x, .98, z, color, { roughness: .27 });
            cap.scale.y = .14;
        });
        for (let x = -.43; x <= .43; x += .14) box(.053, .025, .64, x, .71, -.17, 0x202b2d);
        box(.74, .08, .22, 0, .74, 1.15, 0x78c493, glowing(0x56c091));
        for (const x of [-2.3, 2.3]) for (const z of [-1.64, 1.64]) {
            column(.08, .036, x, .71, z, 0xb7bbb3, metal);
            box(.1, .01, .024, x, .734, z, dark);
        }
    }

    function bridge() {
        box(8.4, .23, 4.9, 0, .16, 0, 0x416f78, { roughness: .23 });
        for (const side of [-1, 1]) {
            box(2.0, 1.05, 4.45, side * 3.08, .74, 0, 0x76746c, stone);
            box(2.09, .19, 4.42, side * 3.08, 1.35, 0, 0x67875d);
            for (let i = 0; i < 9; i++) {
                const boulder = rock(.29 + (i % 3) * .07, side * (2.18 + (i % 2) * .08), .47 + (i % 3) * .22, -2 + i * .49, 0x817d6f);
                boulder.rotation.y = i * .64;
            }
        }
        [-1.37, 0, 1.37].forEach((x, index) => {
            const y = index === 1 ? .96 : 1.37;
            for (let i = -2; i <= 2; i++) box(.24, .1, 1.25, x + .25 * i, y, 0, i % 2 ? 0xb58453 : 0xc49864);
            for (const z of [-.55, .55]) box(1.28, .16, .1, x, y - .1, z, dark, metal);
            box(.36, .07, .24, x, y + .085, -.42, index === 1 ? brass : 0x52aa81);
        });
        column(.21, .37, -2.83, 1.6, .18, 0xc3583c);
        ball(.205, -2.83, 1.9, .18, brass);
        column(.043, .76, 3.34, 1.8, -.5, dark);
        box(.52, .26, .035, 3.12, 2.04, -.5, 0xd06d45);
    }

    function pong() {
        box(7, .15, 3.9, 0, 1.3, 0, 0x227669);
        box(7, .12, 3.92, 0, 1.2, 0, 0x395c56, metal);
        for (const x of [-2.62, 2.62]) for (const z of [-1.46, 1.46]) box(.15, 1.13, .15, x, .6, z, dark, metal);
        for (const z of [-1.82, 1.82]) box(6.72, .014, .043, 0, 1.384, z, ivory);
        for (const x of [-3.33, 3.33]) box(.042, .014, 3.63, x, 1.384, 0, ivory);
        box(6.7, .013, .03, 0, 1.385, 0, ivory);
        for (const z of [-1.94, 1.94]) column(.039, .5, 0, 1.63, z, dark, metal);
        for (let i = 0; i <= 28; i++) box(.018, .36, .015, 0, 1.57, -1.94 + i * .1385, 0x233731);
        for (let i = 0; i <= 5; i++) box(.016, .015, 3.88, 0, 1.39 + i * .072, 0, i === 5 ? ivory : dark);
        for (const side of [-1, 1]) {
            column(.47, .075, side * 2.48, 1.44, side * .75, side === -1 ? 0xc84d44 : 0x394a57);
            box(.66, .095, .18, side * 2.96, 1.46, side * .86, 0xaf8863).rotation.y = -.2;
        }
        ball(.13, .68, 1.66, -.56, ivory);
    }

    function four() {
        for (const x of [-2.8, 2.8]) {
            box(.52, .16, 2.15, x, .15, 0, dark, metal);
            box(.25, 3.85, .55, x, 2.05, 0, 0x294f6d);
        }
        const panel = new THREE.Shape();
        panel.moveTo(-2.75, -.12);
        panel.lineTo(2.75, -.12);
        panel.lineTo(2.75, 4.22);
        panel.lineTo(-2.75, 4.22);
        panel.closePath();
        const columns = [[0], [1, 0], [1, 0, 0], [0, 1, 1], [1, 1], [0], []];
        for (let x = 0; x < 7; x++) for (let y = 0; y < 6; y++) {
            const cx = (x - 3) * .73;
            const cy = .36 + y * .69;
            const hole = new THREE.Path();
            hole.absarc(cx, cy, .267, 0, 2 * Math.PI, true);
            panel.holes.push(hole);
            if (y < columns[x].length) {
                const color = columns[x][y] ? 0xc45045 : 0xefb744;
                const disc = column(.256, .22, cx, cy + .24, 0, color, { roughness: .3 });
                disc.rotation.x = Math.PI / 2;
            }
        }
        const frame = new THREE.ExtrudeGeometry(panel, { depth: .12, bevelEnabled: true, bevelThickness: .022, bevelSize: .025, bevelSegments: 2, curveSegments: 14 });
        piece(frame, 0x3f78a4, 0, .24, -.24, { roughness: .38 });
        piece(frame, 0x4f8ab3, 0, .24, .12, { roughness: .38 });
    }

    function race() {
        column(3.47, .2, 0, .15, 0, 0x7d9868).scale.x = 1.3;
        const track = piece(new THREE.RingGeometry(1.68, 2.94, 96), 0x3c494c, 0, .26, 0);
        track.rotation.x = -Math.PI / 2;
        track.scale.x = 1.36;
        for (let i = 0; i < 36; i++) {
            const angle = i * Math.PI / 18;
            box(.27, .025, .043, 3.1 * Math.cos(angle), .28, 2.3 * Math.sin(angle), ivory).rotation.y = -angle - Math.PI / 2;
        }
        for (let x = 0; x < 6; x++) for (let z = 0; z < 2; z++) {
            box(.23, .035, .22, 2.57 + x * .23, .285, (z - .5) * .22, (x + z) % 2 ? ivory : dark);
        }
        [1.7, 3.05, 4.62].forEach(angle => {
            const x = 4.12 * Math.cos(angle), z = 3.04 * Math.sin(angle);
            column(.09, .46, x, .49, z, dark);
            ball(.13, x, .77, z, brass, glowing(brass));
        });
        [[-2.1, 1.68, 0x47a3ac], [1.8, -1.95, 0xd35842], [.35, 2.27, 0xe4b049]].forEach(([x, z, color]) => {
            box(.83, .15, .4, x, .42, z, color, metal);
            box(.34, .13, .35, x + .03, .55, z, 0x45646f, { metalness: .36, roughness: .18 });
            for (const dx of [-.24, .25]) for (const dz of [-.22, .22]) column(.11, .1, x + dx, .35, z + dz, dark).rotation.x = Math.PI / 2;
        });
    }

    const builders = { laberinto: maze, orbita: orbit, memoria: memory, puente: bridge, pong, cuatro: four, carrera: race };
    builders[type]();
    return model;
}

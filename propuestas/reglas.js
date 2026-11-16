const WIDTH = 720;
const HEIGHT = 400;
const COLORS = ['#79e0a7', '#ffc474', '#8ab7ff', '#ee8bae'];
const SKY = '#172e2a';
const TEXT = '#f5efdc';
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const command = (id, label, key, hold = false) => ({ id, label, key, hold });
const left = command('izquierda', 'Izquierda ←', 'ArrowLeft', true);
const right = command('derecha', 'Derecha →', 'ArrowRight', true);
const up = command('arriba', 'Arriba ↑', 'ArrowUp', true);
const down = command('abajo', 'Abajo ↓', 'ArrowDown', true);
const directions = { izquierda: [-1, 0], derecha: [1, 0], arriba: [0, -1], abajo: [0, 1] };
const axis = (buttons, a, b) => Number(buttons.has(b)) - Number(buttons.has(a));

function panel(ctx, color) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
}

function rect(ctx, color, x, y, w, h) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
}

function circle(ctx, color, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
}

function label(ctx, text, x, y, size = 18, color = TEXT) {
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
}

function line(ctx, color, points, width = 2, close = false) {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    if (close) ctx.closePath();
    ctx.stroke();
}

const MAZE = [
    '#############', '#...#.......#', '###.#.###.#.#', '#...#.#...#.#',
    '#.###.#.###.#', '#.....#.....#', '#.#######.#.#', '#.........#.#',
    '###########.#'
];
const mazeGoal = [11, 8];
const mazeRules = {
    seats: 1,
    controls: () => [up, left, down, right].map(action => ({ ...action, hold: false })),
    hint: 'Usa las flechas o el tablero. Cruza la salida verde antes de los 45 segundos.',
    create: () => ({ posicion: [1, 1], tiempoRestante: 45, intentos: 1, resultado: '' }),
    tick(s, dt) {
        s.tiempoRestante = Math.max(0, s.tiempoRestante - dt);
        if (!s.tiempoRestante) s.resultado = 'Se acabó el tiempo';
    },
    press(s, _seat, action) {
        const [dx, dy] = directions[action];
        const x = s.posicion[0] + dx, y = s.posicion[1] + dy;
        if (MAZE[y]?.[x] !== '.') return;
        s.posicion = [x, y];
        if (x === mazeGoal[0] && y === mazeGoal[1]) s.resultado = '¡Encontraste la salida!';
    },
    status: s => `${Math.ceil(s.tiempoRestante)} s restantes · Intento ${s.intentos}`,
    draw(ctx, s) {
        panel(ctx, SKY);
        const size = 36, ox = 126, oy = 32;
        for (const [y, row] of MAZE.entries()) {
            [...row].forEach((tile, x) => {
                const color = tile === '#' ? '#4d7569' : (x + y) % 2 ? '#24423b' : '#203b35';
                rect(ctx, color, ox + x * size, oy + y * size, size - 1, size - 1);
            });
        }
        rect(ctx, COLORS[0], ox + mazeGoal[0] * size + 4, oy + mazeGoal[1] * size + 4, 27, 27);
        const [x, y] = s.posicion;
        circle(ctx, COLORS[1], ox + x * size + 18, oy + y * size + 18, 11);
    }
};

const spaceRules = {
    seats: 1,
    controls: () => [left, right, command('impulso', 'Impulso ↑', 'ArrowUp', true)],
    hint: 'Gira con ← y →. Mantén ↑ para acelerar. La nave y los asteroides reaparecen por el lado opuesto.',
    create: () => ({
        x: 360, y: 200, giro: -Math.PI / 2, vx: 0, vy: 0, combustible: 100, puntos: 0, tiempo: 0, resultado: '',
        asteroides: [[84, 52, 40, 24, 27], [630, 50, -33, 39, 21], [600, 315, -40, -20, 34],
            [120, 310, 28, -28, 23], [20, 187, 50, 11, 19], [670, 215, -45, -8, 15]]
    }),
    tick(s, dt, input) {
        const buttons = input(1);
        s.giro += axis(buttons, 'izquierda', 'derecha') * 3.5 * dt;
        if (buttons.has('impulso') && s.combustible > 0) {
            s.vx += Math.cos(s.giro) * 195 * dt;
            s.vy += Math.sin(s.giro) * 195 * dt;
            s.combustible = Math.max(0, s.combustible - 7 * dt);
        }
        const speed = Math.hypot(s.vx, s.vy);
        const limit = speed > 250 ? 250 / speed : 1;
        s.vx *= limit * Math.exp(-.19 * dt);
        s.vy *= limit * Math.exp(-.19 * dt);
        s.x = (s.x + s.vx * dt + WIDTH) % WIDTH;
        s.y = (s.y + s.vy * dt + HEIGHT) % HEIGHT;
        for (const asteroid of s.asteroides) {
            asteroid[0] = (asteroid[0] + asteroid[2] * dt + WIDTH) % WIDTH;
            asteroid[1] = (asteroid[1] + asteroid[3] * dt + HEIGHT) % HEIGHT;
            const dx = Math.abs(asteroid[0] - s.x), dy = Math.abs(asteroid[1] - s.y);
            if (Math.hypot(Math.min(dx, WIDTH - dx), Math.min(dy, HEIGHT - dy)) < asteroid[4] + 8) {
                s.resultado = 'La nave chocó con un asteroide';
                return;
            }
        }
        s.tiempo += dt;
        s.puntos = Math.floor(s.tiempo * 10);
        if (s.tiempo >= 35) s.resultado = '¡Completaste los 35 segundos de vuelo!';
    },
    status: s => `Combustible ${Math.ceil(s.combustible)} % · ${s.puntos} puntos`,
    draw(ctx, s) {
        panel(ctx, '#162339');
        for (let i = 0; i < 40; i++) circle(ctx, i % 3 ? '#405671' : '#889ca9', (i * 171 + 30) % WIDTH, (i * 97 + 14) % HEIGHT, i % 3 ? 1 : 2);
        for (const [i, [x, y, , , r]] of s.asteroides.entries()) {
            const points = Array.from({ length: 8 }, (_, j) => {
                const angle = j * Math.PI / 4;
                const radius = r * (1 + .12 * Math.sin(i + j * 12));
                return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
            });
            ctx.beginPath();
            for (const [px, py] of points) ctx.lineTo(px, py);
            ctx.closePath();
            ctx.fillStyle = '#657281';
            ctx.fill();
            line(ctx, '#a0a8ab', points, 2, true);
        }
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.giro);
        line(ctx, '#a3eaff', [[17, 0], [-12, -10], [-6, 0], [-12, 10]], 4, true);
        ctx.restore();
    }
};

const signals = ['verde', 'amarillo', 'azul', 'rosa'];
const startMemory = s => {
    s.secuencia.push(signals[Math.floor(Math.random() * signals.length)]);
    s.ronda = s.secuencia.length;
    s.fase = 'muestra';
    s.tiempo = -.35;
    s.luz = null;
    s.aciertos = 0;
};
const memoryRules = {
    seats: 1,
    controls: () => signals.map((signal, i) => command(signal, `${i + 1} · ${signal}`, `Digit${i + 1}`)),
    hint: 'Mira las luces. Cuando aparezca «Tu turno», repite el orden con 1, 2, 3 y 4.',
    create: () => {
        const state = { ronda: 0, fase: 'muestra', aciertos: 0, luz: null, tiempo: 0, secuencia: [], resultado: '' };
        startMemory(state);
        return state;
    },
    tick(s, dt) {
        s.tiempo += dt;
        if (s.fase === 'pausa' && s.tiempo >= .7) startMemory(s);
        if (s.fase !== 'muestra') return;
        const index = Math.floor(s.tiempo / .9);
        if (index >= s.secuencia.length) {
            s.fase = 'respuesta';
            s.luz = null;
        } else {
            s.luz = index >= 0 && s.tiempo % .9 < .54 ? s.secuencia[index] : null;
        }
    },
    press(s, _seat, action) {
        if (s.fase !== 'respuesta') return;
        if (s.secuencia[s.aciertos] !== action) {
            s.resultado = `Fin de partida · Rondas completas ${s.ronda - 1}`;
            return;
        }
        s.aciertos++;
        if (s.aciertos === s.ronda) {
            s.fase = 'pausa';
            s.tiempo = 0;
        }
    },
    snapshot(s) {
        const { secuencia, ...visible } = s;
        return visible;
    },
    status: s => `Ronda ${s.ronda} · ${s.fase === 'respuesta' ? `Tu turno (${s.aciertos}/${s.ronda})` : s.fase === 'pausa' ? '¡Secuencia completa!' : 'Observa las luces'}`,
    draw(ctx, s) {
        panel(ctx, '#243534');
        for (const [i, signal] of signals.entries()) {
            const x = 254 + (i % 2) * 212, y = 113 + Math.floor(i / 2) * 173;
            circle(ctx, '#142724', x, y, 69);
            ctx.globalAlpha = s.luz === signal ? 1 : .35;
            circle(ctx, COLORS[i], x, y, 60);
            ctx.globalAlpha = 1;
            if (s.luz === signal) circle(ctx, '#fff9e5', x, y - 24, 8);
            label(ctx, `${i + 1}`, x - 8, y + 11, 28);
        }
    }
};

const BANKS = [[0, 145, 285], [575, 720, 285]];
const PIERS = [[152, 268, 280], [303, 417, 241], [452, 568, 280]];
const bridgeRules = {
    seats: 2,
    controls: seat => seat === 1
        ? [left, right, command('saltar', 'Saltar ↑', 'ArrowUp')]
        : [1, 2, 3].map(n => command(`tramo-${n}`, `Tramo ${n}`, `Digit${n}`)),
    hint: 'El explorador usa ←, → y ↑. El operador activa o baja tramos con 1, 2 y 3, incluso desde el teclado del anfitrión.',
    create: () => ({ x: 63, y: 285, velocidadY: 0, suelo: true, plataformasActivas: [], caidas: 0, resultado: '' }),
    press(s, seat, action) {
        if (seat === 1 && action === 'saltar' && s.suelo) {
            s.velocidadY = -435;
            s.suelo = false;
        }
        if (seat === 2) {
            const n = Number(action.at(-1));
            s.plataformasActivas = s.plataformasActivas.includes(n)
                ? s.plataformasActivas.filter(item => item !== n) : [...s.plataformasActivas, n];
        }
    },
    tick(s, dt, input) {
        s.x = clamp(s.x + axis(input(1), 'izquierda', 'derecha') * 147 * dt, 12, 708);
        const before = s.y;
        s.velocidadY += 1050 * dt;
        s.y += s.velocidadY * dt;
        s.suelo = false;
        if (s.velocidadY >= 0) {
            const surfaces = [...BANKS, ...PIERS.filter((_, i) => s.plataformasActivas.includes(i + 1))];
            for (const [x1, x2, y] of surfaces) {
                if (s.x + 5 >= x1 && s.x - 5 <= x2 && before <= y && s.y >= y) {
                    s.y = y;
                    s.velocidadY = 0;
                    s.suelo = true;
                    break;
                }
            }
        }
        if (s.y > 355) {
            s.caidas++;
            Object.assign(s, { x: 63, y: 285, velocidadY: 0, suelo: true });
        }
        if (s.x >= 648 && s.suelo) s.resultado = '¡Cruzaron el puente!';
    },
    status: s => `Tramos activos ${s.plataformasActivas.length}/3 · Caídas ${s.caidas}`,
    draw(ctx, s) {
        panel(ctx, '#254842');
        rect(ctx, '#235c67', 0, 311, WIDTH, 89);
        for (let i = 0; i < 8; i++) line(ctx, '#4a8589', [[24 + i * 90, 337 + i % 3 * 16], [63 + i * 90, 337 + i % 3 * 16]]);
        for (const [a, b, y] of BANKS) {
            rect(ctx, '#495448', a, y, b - a, 115);
            rect(ctx, '#8db477', a, y, b - a, 8);
        }
        for (const [i, [a, b, y]] of PIERS.entries()) {
            const active = s.plataformasActivas.includes(i + 1);
            const height = active ? y : 329;
            rect(ctx, active ? '#d49e65' : '#557781', a, height, b - a, 9);
            label(ctx, `${i + 1}`, (a + b) / 2 - 4, height - 11, 17);
        }
        rect(ctx, TEXT, 663, 234, 3, 51);
        rect(ctx, COLORS[1], 666, 235, 25, 15);
        rect(ctx, COLORS[1], s.x - 7, s.y - 22, 14, 21);
        circle(ctx, TEXT, s.x, s.y - 25, 8);
    }
};

function serve(s, direction) {
    s.pelota = [WIDTH / 2, HEIGHT / 2];
    s.velocidad = [direction * 295, (Math.random() < .5 ? -1 : 1) * 125];
    s.espera = .75;
}
const pongRules = {
    seats: 2,
    controls: () => [up, down],
    hint: 'En el anfitrión, el jugador 1 usa ↑/↓ y el jugador 2 W/S. También pueden conectarse dos tableros.',
    create: () => {
        const state = { raquetas: [200, 200], marcador: [0, 0], resultado: '' };
        serve(state, 1);
        return state;
    },
    tick(s, dt, input) {
        for (let i = 0; i < 2; i++) {
            s.raquetas[i] = clamp(s.raquetas[i] + axis(input(i + 1), 'arriba', 'abajo') * 287 * dt, 50, 350);
        }
        if (s.espera > 0) { s.espera -= dt; return; }
        const [x, y] = s.pelota, [vx, vy] = s.velocidad;
        const nx = x + vx * dt, ny = y + vy * dt;
        s.pelota = [nx, clamp(ny, 9, HEIGHT - 9)];
        if (ny <= 9 || ny >= HEIGHT - 9) s.velocidad[1] *= -1;
        const side = vx < 0 ? 0 : 1, edge = side ? WIDTH - 43 : 43;
        if ((nx - edge) * vx >= 0 && (x - edge) * vx < 0 && Math.abs(s.pelota[1] - s.raquetas[side]) <= 48) {
            s.pelota[0] = edge;
            s.velocidad = [-Math.sign(vx) * Math.min(550, Math.abs(vx) * 1.08), (s.pelota[1] - s.raquetas[side]) * 6.2];
        }
        if (nx < -12 || nx > WIDTH + 12) {
            const scorer = nx < 0 ? 1 : 0;
            s.marcador[scorer]++;
            if (s.marcador[scorer] >= 11 && s.marcador[scorer] - s.marcador[1 - scorer] >= 2) {
                s.resultado = `Ganó el jugador ${scorer + 1} · ${s.marcador.join(' a ')}`;
            } else serve(s, nx < 0 ? -1 : 1);
        }
    },
    status: s => `Jugador 1  ${s.marcador[0]} — ${s.marcador[1]}  Jugador 2`,
    draw(ctx, s) {
        panel(ctx, '#225652');
        ctx.strokeStyle = '#86ada0';
        ctx.strokeRect(13, 12, WIDTH - 26, HEIGHT - 24);
        for (let y = 24; y < HEIGHT - 20; y += 23) rect(ctx, '#86ada0', WIDTH / 2 - 1, y, 2, 10);
        for (const [i, y] of s.raquetas.entries()) rect(ctx, COLORS[i], i ? WIDTH - 35 : 25, y - 40, 10, 80);
        circle(ctx, TEXT, ...s.pelota, 8);
    }
};

function connectedFour(grid, x, y, seat) {
    return [[1, 0], [0, 1], [1, 1], [1, -1]].some(([dx, dy]) => {
        let run = 1;
        for (const sign of [-1, 1]) {
            let step = 1;
            while (grid[y + dy * step * sign]?.[x + dx * step * sign] === seat) {
                run++;
                step++;
            }
        }
        return run >= 4;
    });
}
const fourRules = {
    seats: 2,
    controls: () => Array.from({ length: 7 }, (_, i) => command(`columna-${i + 1}`, `${i + 1}`, `Digit${i + 1}`)),
    hint: 'Elige una columna con 1–7. En el anfitrión, los mandos siguen el turno automáticamente.',
    create: () => ({ tablero: Array.from({ length: 6 }, () => Array(7).fill(0)), siguienteJugador: 1, turno: 1, jugada: null, resultado: '' }),
    press(s, seat, action, packet) {
        if (seat !== s.siguienteJugador || packet.turno !== s.turno) return;
        const col = Number(action.at(-1)) - 1;
        const row = s.tablero.findLastIndex(values => values[col] === 0);
        if (row < 0) return;
        s.tablero[row][col] = seat;
        s.jugada = { columna: col + 1, fila: row + 1, jugador: seat };
        if (connectedFour(s.tablero, col, row, seat)) s.resultado = `¡Ganó el jugador ${seat}!`;
        else if (s.tablero[0].every(Boolean)) s.resultado = 'Empate · tablero lleno';
        else s.siguienteJugador = 3 - seat;
        s.turno++;
    },
    status: s => `Turno ${s.turno} · Jugador ${s.siguienteJugador}`,
    draw(ctx, s) {
        panel(ctx, '#162b41');
        rect(ctx, '#3a6895', 176, 47, 368, 321);
        for (let col = 0; col < 7; col++) {
            label(ctx, `${col + 1}`, 201 + col * 51, 33, 16);
            for (let row = 0; row < 6; row++) {
                const value = s.tablero[row][col];
                circle(ctx, value ? COLORS[value - 1] : '#223951', 207 + col * 51, 77 + row * 52, 20);
            }
        }
    }
};

const TAU = 2 * Math.PI;
const GATES = [{ progress: .23, lane: -.65 }, { progress: .49, lane: .63 }, { progress: .74, lane: 0 }];
const trackPoint = (progress, lane) => {
    const a = progress * TAU - Math.PI / 2;
    return [360 + Math.cos(a) * (230 + lane * 35), 200 + Math.sin(a) * (128 + lane * 29)];
};
const raceRules = {
    seats: 4,
    controls: () => [left, right, command('acelerar', 'Acelerar ↑', 'ArrowUp', true), command('frenar', 'Frenar ↓', 'ArrowDown', true)],
    hint: 'Acelera con ↑ y frena con ↓. Cambia de carril con ←/→ para pasar por cada baliza. Gana quien complete dos vueltas.',
    create: count => ({
        autos: Array.from({ length: count }, (_, i) => ({ progreso: 0, carril: (i - (count - 1) / 2) * .49, velocidad: 0, baliza: 0, vuelta: 1 })),
        clasificacion: Array.from({ length: count }, (_, i) => i + 1), resultado: ''
    }),
    tick(s, dt, input) {
        for (const [i, car] of s.autos.entries()) {
            const buttons = input(i + 1);
            car.carril = clamp(car.carril + axis(buttons, 'izquierda', 'derecha') * 2.2 * dt, -1, 1);
            const change = buttons.has('frenar') ? -.55 : buttons.has('acelerar') ? .27 : -.11;
            car.velocidad = clamp(car.velocidad + change * dt, 0, .146);
            const next = car.progreso + car.velocidad * dt;
            const gate = GATES[car.baliza];
            if (gate && next >= gate.progress) {
                if (Math.abs(car.carril - gate.lane) > .46) {
                    car.progreso = gate.progress - .002;
                    car.velocidad = 0;
                    continue;
                }
                car.baliza++;
            }
            car.progreso = next;
            if (car.progreso >= 1) {
                if (car.vuelta === 2) {
                    s.resultado = `¡Ganó el jugador ${i + 1}!`;
                    s.clasificacion = [i + 1, ...s.clasificacion.filter(seat => seat !== i + 1)];
                    return;
                }
                car.vuelta++;
                car.baliza = 0;
                car.progreso -= 1;
            }
        }
        const score = seat => s.autos[seat - 1].vuelta + s.autos[seat - 1].progreso;
        s.clasificacion.sort((a, b) => score(b) - score(a));
    },
    status(s, seat) {
        const car = s.autos[seat - 1];
        return `Vuelta ${car.vuelta}/2 · Balizas ${car.baliza}/3 · Orden ${s.clasificacion.join(' · ')}`;
    },
    draw(ctx, s) {
        panel(ctx, '#385746');
        for (const [rx, ry, color] of [[273, 165, '#273b39'], [185, 91, '#385746']]) {
            ctx.beginPath();
            ctx.ellipse(360, 200, rx, ry, 0, 0, TAU);
            ctx.fillStyle = color;
            ctx.fill();
        }
        ctx.beginPath();
        ctx.ellipse(360, 200, 230, 128, 0, 0, TAU);
        ctx.strokeStyle = '#88a798';
        ctx.setLineDash([8, 9]); ctx.stroke(); ctx.setLineDash([]);
        line(ctx, TEXT, [trackPoint(0, -1), trackPoint(0, 1)], 4);
        GATES.forEach((gate, i) => {
            const [x, y] = trackPoint(gate.progress, gate.lane);
            circle(ctx, '#e5be60', x, y, 15);
            label(ctx, `${i + 1}`, x - 4, y + 5, 15, '#273b39');
        });
        for (const [i, car] of s.autos.entries()) {
            const [x, y] = trackPoint(car.progreso, car.carril);
            circle(ctx, COLORS[i], x, y, 12);
            label(ctx, `${i + 1}`, x - 4, y + 5, 14, '#273b39');
        }
    }
};

const rules = { laberinto: mazeRules, orbita: spaceRules, memoria: memoryRules, puente: bridgeRules, pong: pongRules, cuatro: fourRules, carrera: raceRules };

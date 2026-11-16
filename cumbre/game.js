const canvas = document.getElementById('world');
const ctx = canvas.getContext('2d');
const finished = document.getElementById('finished');
const gameStatus = document.getElementById('game-status');
const gemsDisplay = document.getElementById('gems');
const fallsDisplay = document.getElementById('falls');
const colors = getComputedStyle(canvas);
const palette = Object.fromEntries(
    ['sky', 'far', 'near', 'sun', 'water', 'ground', 'grass', 'shade', 'character', 'visor', 'paper', 'ink']
        .map(name => [name, colors.getPropertyValue(`--${name}`).trim()])
);

const worldWidth = 2500;
const platforms = [
    [0, 390, 295], [355, 344, 143], [568, 300, 148], [784, 352, 118],
    [965, 387, 210], [1230, 315, 137], [1434, 247, 113], [1614, 303, 130],
    [1809, 366, 172], [2045, 310, 110], [2222, 245, 108], [2380, 196, 120]
].map(([x, y, width]) => ({ x, y, width }));
const beacons = [[425, 310], [648, 265], [1310, 278], [1678, 268], [2272, 209]];
const start = { x: 86, y: 390 };
const checkpoints = [{ x: 1000, y: 387 }, { x: 1845, y: 366 }];
const finishX = 2446;
const player = { x: start.x, y: start.y, vy: 0, grounded: true, facing: 1 };
const collected = new Set();
const halfWidth = 13;
const playerHeight = 36;
const speed = 270;
const gravity = 1550;
const jumpSpeed = 650;
let camera = 0;
let falls = 0;
let won = false;
let checkpoint = start;
let direction = 0;
let lastControl = -Infinity;
let jumpUntil = -Infinity;

const link = openGameLink('game', payload => {
    if (!payload || ![-1, 0, 1].includes(payload.direction)) return;
    lastControl = performance.now();
    direction = payload.direction;
    if (payload.reset === true) resetGame();
    if (payload.jump === true) jumpUntil = lastControl + 150;
}, () => {
    lastControl = -Infinity;
    direction = 0;
    jumpUntil = -Infinity;
});

function publishState() {
    gemsDisplay.textContent = `${collected.size} / ${beacons.length}`;
    fallsDisplay.textContent = falls;
    link.send({ gems: collected.size, falls, won });
}

function respawn() {
    Object.assign(player, { x: checkpoint.x, y: checkpoint.y, vy: 0, grounded: true, facing: 1 });
    camera = Math.max(0, checkpoint.x - canvas.width * .35);
    jumpUntil = -Infinity;
}

function resetGame() {
    collected.clear();
    falls = 0;
    won = false;
    checkpoint = start;
    finished.hidden = true;
    respawn();
    publishState();
}

function update(dt, now) {
    if (won) return;
    if (player.grounded && now < jumpUntil) {
        player.vy = -jumpSpeed;
        player.grounded = false;
        jumpUntil = -Infinity;
    }

    const motion = now - lastControl < 420 ? direction : 0;
    if (motion) player.facing = motion;
    player.x = Math.max(halfWidth, Math.min(worldWidth - halfWidth, player.x + motion * speed * dt));
    const previousFeet = player.y;
    player.vy += gravity * dt;
    player.y += player.vy * dt;
    player.grounded = false;

    if (player.vy >= 0) {
        for (const platform of platforms) {
            if (previousFeet <= platform.y && player.y >= platform.y &&
                player.x + halfWidth > platform.x && player.x - halfWidth < platform.x + platform.width) {
                player.y = platform.y;
                player.vy = 0;
                player.grounded = true;
                break;
            }
        }
    }
    const nextCheckpoint = checkpoints.findLast(point => player.x >= point.x && player.y === point.y && player.grounded);
    if (nextCheckpoint && nextCheckpoint.x > checkpoint.x) checkpoint = nextCheckpoint;

    if (player.y > canvas.height + 45) {
        falls++;
        respawn();
        publishState();
    }

    beacons.forEach(([x, y], index) => {
        if (!collected.has(index) && Math.abs(x - player.x) < 25 &&
            Math.abs(y - (player.y - playerHeight / 2)) < 32) {
            collected.add(index);
            publishState();
        }
    });
    if (player.grounded && player.x >= finishX && player.y === platforms.at(-1).y) {
        won = true;
        document.getElementById('result').textContent = `Balizas recogidas: ${collected.size} de ${beacons.length}.`;
        finished.hidden = false;
        publishState();
    }
    const target = Math.max(0, Math.min(worldWidth - canvas.width, player.x - canvas.width * .38));
    camera += (target - camera) * Math.min(1, dt * 6);
}

function rect(color, x, y, width, height) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function polygon(color, points) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (const point of points.slice(1)) ctx.lineTo(...point);
    ctx.closePath();
    ctx.fill();
}

function flag(x, y, color) {
    rect(palette.ink, x, y - 64, 4, 64);
    polygon(color, [[x + 4, y - 64], [x + 37, y - 57], [x + 4, y - 45]]);
}

function drawLandscape(now) {
    rect(palette.sky, 0, 0, canvas.width, canvas.height);
    ctx.fillStyle = palette.sun;
    ctx.beginPath();
    ctx.arc(760 - camera * .12, 108, 55, 0, Math.PI * 2);
    ctx.fill();
    const far = -camera * .16;
    polygon(palette.far, [[far - 30, 390], [far + 255, 120], [far + 425, 283], [far + 613, 144],
        [far + 810, 300], [far + 1000, 180], [far + 1340, 430], [far + 1340, 480], [far - 30, 480]]);
    const near = -camera * .29;
    polygon(palette.near, [[near, 350], [near + 155, 265], [near + 287, 356], [near + 495, 219],
        [near + 705, 387], [near + 885, 282], [near + 1110, 368], [near + 1340, 253],
        [near + 1500, 390], [near + 1500, 480], [near, 480]]);
    rect(palette.water, 0, 437, canvas.width, 43);
    for (let x = 5; x < canvas.width; x += 77) {
        rect(palette.sky, x + Math.sin(now / 1100 + x) * 5, 447 + x % 23, 24, 2);
    }
}

function drawExplorer(now) {
    ctx.save();
    ctx.translate(Math.round(player.x), Math.round(player.y));
    ctx.scale(player.facing, 1);
    const stride = player.grounded && direction && now - lastControl < 420 ? Math.round(Math.sin(now / 65) * 4) : 0;
    rect(palette.shade, -14, -22, 8, 16);
    rect(palette.character, -9, -24, 21, 15);
    rect(palette.ink, -7, -10, 6, 10 + Math.min(stride, 0));
    rect(palette.ink, 4, -10, 6, 10 - Math.max(stride, 0));
    rect(palette.ink, -10, -34, 23, 13);
    rect(palette.character, -8, -37, 18, 6);
    rect(palette.visor, 1, -31, 13, 7);
    rect(palette.paper, 8, -20, 8, 4);
    ctx.restore();
}

function draw(now) {
    drawLandscape(now);
    ctx.save();
    ctx.translate(-Math.round(camera), 0);
    for (const { x, y, width } of platforms) {
        rect(palette.shade, x + 4, y + 10, width - 8, 22);
        rect(palette.ground, x, y + 5, width, 19);
        rect(palette.grass, x, y, width, 6);
        for (let tuft = x + 8; tuft < x + width - 5; tuft += 27) rect(palette.grass, tuft, y - 2, 4, 2);
    }
    for (const point of checkpoints) flag(point.x - 22, point.y, checkpoint.x >= point.x ? palette.sun : palette.paper);
    flag(finishX, platforms.at(-1).y, palette.character);
    beacons.forEach(([x, y], index) => {
        if (collected.has(index)) return;
        const height = y + Math.sin(now / 350 + index) * 4;
        polygon(palette.ink, [[x, height - 12], [x + 11, height], [x, height + 12], [x - 11, height]]);
        polygon(palette.sun, [[x, height - 8], [x + 7, height], [x, height + 8], [x - 7, height]]);
    });
    drawExplorer(now);
    ctx.restore();
}

document.getElementById('play-again').addEventListener('click', resetGame);
let previousFrame = 0;
function frame(now) {
    const elapsed = previousFrame ? Math.min((now - previousFrame) / 1000, .04) : 0;
    previousFrame = now;
    if (elapsed) update(elapsed, now);
    draw(now);
    requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setInterval(() => {
    link.send({ gems: collected.size, falls, won });
    const status = performance.now() - lastControl < 2300 ? 'Tablero conectado' : 'Esperando el tablero';
    if (gameStatus.textContent !== status) gameStatus.textContent = status;
}, 600);

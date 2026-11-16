const buttons = {
    left: document.getElementById('left'),
    right: document.getElementById('right'),
    jump: document.getElementById('jump')
};
const gameStatus = document.getElementById('game-status');
const gems = document.getElementById('gems');
const falls = document.getElementById('falls');
const pointers = new Map();
const keys = new Set();
let lastGame = -Infinity;

const link = openGameLink('dashboard', state => {
    if (!state || !Number.isSafeInteger(state.gems) || state.gems < 0 || state.gems > 5 ||
        !Number.isSafeInteger(state.falls) || state.falls < 0 || typeof state.won !== 'boolean') return;
    lastGame = performance.now();
    gems.textContent = `${state.gems} / 5`;
    falls.textContent = state.falls;
    showGameStatus(state.won ? '¡Llegaste a la cima!' : 'Juego conectado');
}, () => { lastGame = -Infinity; });

function showGameStatus(message) {
    if (gameStatus.textContent !== message) gameStatus.textContent = message;
}

function isHeld(action) {
    return keys.has(action) || [...pointers.values()].includes(action);
}

function sendControl(action) {
    const direction = Number(isHeld('right')) - Number(isHeld('left'));
    link.send({ direction, jump: action === 'jump', reset: action === 'reset' });
}

function refreshButtons() {
    for (const [action, button] of Object.entries(buttons)) {
        button.classList.toggle('is-held', isHeld(action));
    }
}

for (const [action, button] of Object.entries(buttons)) {
    button.addEventListener('pointerdown', event => {
        if (event.button !== 0) return;
        event.preventDefault();
        button.setPointerCapture(event.pointerId);
        pointers.set(event.pointerId, action);
        refreshButtons();
        sendControl(action);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        button.addEventListener(type, event => {
            if (!pointers.delete(event.pointerId)) return;
            refreshButtons();
            sendControl();
        });
    }
    button.addEventListener('click', event => {
        if (event.detail === 0 && action === 'jump') sendControl('jump');
    });
}

const keyboard = new Map([['ArrowLeft', 'left'], ['ArrowRight', 'right'], ['ArrowUp', 'jump'], ['Space', 'jump']]);
const pressedCodes = new Set();
window.addEventListener('keydown', event => {
    const action = keyboard.get(event.code);
    if (!action || event.target.closest?.('input, select, textarea, [contenteditable]')) return;
    if (event.code === 'Space' && event.target.closest?.('button, summary, a')) return;
    event.preventDefault();
    if (pressedCodes.has(event.code)) return;
    pressedCodes.add(event.code);
    keys.add(action);
    refreshButtons();
    sendControl(action);
});
window.addEventListener('keyup', event => {
    if (!pressedCodes.delete(event.code)) return;
    const action = keyboard.get(event.code);
    if (![...pressedCodes].some(code => keyboard.get(code) === action)) keys.delete(action);
    refreshButtons();
    sendControl();
});

function releaseControls() {
    pointers.clear();
    pressedCodes.clear();
    keys.clear();
    refreshButtons();
    sendControl();
}

window.addEventListener('blur', releaseControls);
document.addEventListener('visibilitychange', () => { if (document.hidden) releaseControls(); });
document.getElementById('reset').addEventListener('click', () => sendControl('reset'));

let lastInput = -Infinity;
setInterval(() => {
    const now = performance.now();
    if (isHeld('left') || isHeld('right') || now - lastInput > 900) {
        sendControl();
        lastInput = now;
    }
    if (now - lastGame > 2300) {
        showGameStatus('Buscando el juego…');
        gems.textContent = '—';
        falls.textContent = '—';
    }
}, 100);

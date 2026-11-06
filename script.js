// --- Web Audio API Synthesizer ---
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.enabled = true;
    }

    init() {
        if (!this.ctx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playJump() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'square';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    playBoost() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(900, this.ctx.currentTime + 0.18);

        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.18);
    }

    playCactusHit() {
        if (!this.enabled) return;
        this.init();
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(120, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(30, this.ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.25);
    }

    playBeyonceCatch() {
        if (!this.enabled) return;
        this.init();
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sawtooth';

        osc1.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc1.frequency.linearRampToValueAtTime(80, this.ctx.currentTime + 0.5);

        osc2.frequency.setValueAtTime(290, this.ctx.currentTime);
        osc2.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.5);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(this.ctx.currentTime + 0.5);
        osc2.stop(this.ctx.currentTime + 0.5);
    }
}

const sounds = new SoundEngine();

// --- Canvas Setup ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const gameOverScreen = document.getElementById('gameOverScreen');
const gameOverTitle = document.getElementById('gameOverTitle');
const gameOverReason = document.getElementById('gameOverReason');
const restartBtn = document.getElementById('restartBtn');
const playerSpeedInput = document.getElementById('playerSpeed');
const beyonceSpeedInput = document.getElementById('beyonceSpeed');
const playerSpeedValue = document.getElementById('playerSpeedValue');
const beyonceSpeedValue = document.getElementById('beyonceSpeedValue');
const soundToggle = document.getElementById('soundToggle');
const touchJumpBtn = document.getElementById('touchJumpBtn');
const touchBoostBtn = document.getElementById('touchBoostBtn');
const boostBar = document.getElementById('boostBar');
const boostText = document.getElementById('boostText');

// Game Constants
const GROUND_Y = 200;
const GRAVITY = 0.6;
const BOOST_COOLDOWN_MS = 3000;
const BOOST_DURATION_FRAMES = 18;
const PHASE_DURATION_SEC = 7;

// Safe localStorage helpers
function loadHighScore() {
    try {
        return parseFloat(localStorage.getItem('beyonce_runner_hi')) || 0;
    } catch (e) {
        return 0;
    }
}

function saveHighScore(value) {
    try {
        localStorage.setItem('beyonce_runner_hi', value);
    } catch (e) {
        /* almacenamiento no disponible */
    }
}

// Game State Variables
let isRunning = false;
let score = 0;
let highScore = loadHighScore();
let gameSpeed = 5;
let frameCount = 0;

// Dynamic Day/Sunset/Night Engine
let gameStartTime = 0;
let currentPhaseIndex = 0; // 0: Mañana, 1: Atardecer, 2: Noche
let beyonceAccelerationFactor = 0;

// Boost Engine
let lastBoostTime = 0;
let boostActiveFrames = 0;

// Multipliers from Sliders
let playerSpeedMult = 1.0;
let beyonceSpeedMult = 1.0;

// Phase Visual Palettes
const PHASES = [
    { bg: '#f7f7f7', ground: '#535353', sunMoon: '#fbbf24', overlay: null },
    { bg: '#fce7f3', ground: '#4c0519', sunMoon: '#f97316', overlay: 'rgba(234, 88, 12, 0.18)' },
    { bg: '#111827', ground: '#e5e7eb', sunMoon: '#fef08a', overlay: 'rgba(15, 23, 42, 0.45)' }
];

// Entities
let player = {
    x: 220,
    y: GROUND_Y - 40,
    width: 30,
    height: 40,
    velocityY: 0,
    isJumping: false,
    legFrame: 0
};

let beyonce = {
    x: 40,
    y: GROUND_Y - 45,
    width: 36,
    height: 45,
    legFrame: 0
};

let obstacles = [];
let clouds = [];

// Sliders Listeners
playerSpeedInput.addEventListener('input', (e) => {
    playerSpeedMult = parseFloat(e.target.value);
    playerSpeedValue.innerText = playerSpeedMult.toFixed(1) + 'x';
});

beyonceSpeedInput.addEventListener('input', (e) => {
    beyonceSpeedMult = parseFloat(e.target.value);
    beyonceSpeedValue.innerText = beyonceSpeedMult.toFixed(1) + 'x';
});

soundToggle.addEventListener('click', () => {
    sounds.enabled = !sounds.enabled;
    soundToggle.innerText = sounds.enabled ? '🔊 SONIDO: ON' : '🔇 SONIDO: OFF';
});

// --- Render Functions ---
function drawEnvironment() {
    const activePhase = PHASES[currentPhaseIndex];

    // Background Sky Color
    ctx.fillStyle = activePhase.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Celestial Bodies (Sun / Moon)
    if (currentPhaseIndex === 0) { // Morning
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(680, 25, 30, 30);
        ctx.fillRect(675, 30, 40, 20);
    } else if (currentPhaseIndex === 1) { // Sunset
        ctx.fillStyle = '#f97316';
        ctx.fillRect(680, 45, 32, 32);
        ctx.fillRect(674, 52, 44, 18);
    } else if (currentPhaseIndex === 2) { // Night Moon
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(680, 25, 26, 26);
        ctx.fillRect(676, 29, 34, 18);
        ctx.fillStyle = activePhase.bg;
        ctx.fillRect(694, 25, 14, 14);
    }

    // Ground Line & Texture
    ctx.strokeStyle = activePhase.ground;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(canvas.width, GROUND_Y);
    ctx.stroke();

    ctx.fillStyle = activePhase.ground;
    for (let i = 0; i < canvas.width; i += 20) {
        const offsetX = (i - (score * 3)) % canvas.width;
        const renderX = offsetX < 0 ? offsetX + canvas.width : offsetX;
        if (i % 40 === 0) {
            ctx.fillRect(renderX, GROUND_Y + 6, 4, 2);
            ctx.fillRect(renderX + 12, GROUND_Y + 14, 2, 2);
        } else if (i % 30 === 0) {
            ctx.fillRect(renderX, GROUND_Y + 10, 6, 2);
        }
    }
}

function drawPhaseShading() {
    const activePhase = PHASES[currentPhaseIndex];
    if (activePhase.overlay) {
        ctx.fillStyle = activePhase.overlay;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function drawClouds() {
    ctx.fillStyle = currentPhaseIndex === 2 ? '#374151' : '#c4c4c4';
    clouds.forEach(cloud => {
        ctx.fillRect(cloud.x, cloud.y, 40, 10);
        ctx.fillRect(cloud.x + 10, cloud.y - 6, 20, 6);
        ctx.fillRect(cloud.x + 15, cloud.y - 10, 10, 4);
    });
}

function drawPlayer() {
    const isNight = currentPhaseIndex === 2;
    ctx.fillStyle = boostActiveFrames > 0 ? '#10b981' : (isNight ? '#f3f4f6' : '#535353');
    const px = player.x;
    const py = player.y;

    // Head & Body
    ctx.fillRect(px + 8, py, 14, 12);
    ctx.fillRect(px + 6, py + 12, 18, 16);
    ctx.fillRect(px + 18, py + 16, 8, 4);

    // Speed Boost Tail Particles
    if (boostActiveFrames > 0) {
        ctx.fillStyle = '#a7f3d0';
        ctx.fillRect(px - 14, py + 12, 10, 3);
        ctx.fillRect(px - 22, py + 20, 14, 3);
        ctx.fillRect(px - 10, py + 26, 8, 3);
        ctx.fillStyle = '#10b981';
    }

    // Animated Running Legs
    if (player.isJumping) {
        ctx.fillRect(px + 6, py + 28, 6, 12);
        ctx.fillRect(px + 18, py + 28, 6, 8);
    } else {
        const legAnim = Math.floor(player.legFrame / 6) % 2;
        if (legAnim === 0) {
            ctx.fillRect(px + 6, py + 28, 6, 12);
            ctx.fillRect(px + 18, py + 28, 6, 6);
            ctx.fillRect(px + 22, py + 34, 4, 6);
        } else {
            ctx.fillRect(px + 6, py + 28, 6, 6);
            ctx.fillRect(px + 2, py + 34, 6, 6);
            ctx.fillRect(px + 18, py + 28, 6, 12);
        }
    }
}

function drawBeyonce() {
    const isNight = currentPhaseIndex === 2;
    ctx.fillStyle = isNight ? '#e5e7eb' : '#333333';
    const bx = beyonce.x;
    const by = beyonce.y;

    // Hair
    ctx.fillRect(bx + 2, by, 32, 16);
    ctx.fillRect(bx, by + 4, 36, 16);

    // Face & Outfit
    ctx.fillStyle = isNight ? '#9ca3af' : '#535353';
    ctx.fillRect(bx + 14, by + 12, 14, 10);
    ctx.fillRect(bx + 10, by + 22, 18, 12);

    // Microphone
    ctx.fillRect(bx + 26, by + 22, 10, 4);
    ctx.fillRect(bx + 34, by + 18, 4, 6);

    // Legs
    const legAnim = Math.floor(beyonce.legFrame / 5) % 2;
    if (legAnim === 0) {
        ctx.fillRect(bx + 10, by + 34, 6, 11);
        ctx.fillRect(bx + 20, by + 34, 6, 6);
        ctx.fillRect(bx + 24, by + 40, 4, 5);
    } else {
        ctx.fillRect(bx + 10, by + 34, 6, 6);
        ctx.fillRect(bx + 6, by + 40, 6, 5);
        ctx.fillRect(bx + 20, by + 34, 6, 11);
    }
}

function drawObstacles() {
    const activePhase = PHASES[currentPhaseIndex];
    ctx.fillStyle = activePhase.ground;
    obstacles.forEach(obs => {
        const ox = obs.x;
        const oy = obs.y;
        const w = obs.width;
        const h = obs.height;

        ctx.fillRect(ox + w * 0.35, oy, w * 0.3, h);
        ctx.fillRect(ox, oy + h * 0.3, w * 0.35, h * 0.15);
        ctx.fillRect(ox, oy + h * 0.15, w * 0.15, h * 0.3);
        ctx.fillRect(ox + w * 0.65, oy + h * 0.4, w * 0.35, h * 0.15);
        ctx.fillRect(ox + w * 0.85, oy + h * 0.2, w * 0.15, h * 0.35);
    });
}

function drawScore() {
    ctx.fillStyle = currentPhaseIndex === 2 ? '#e5e7eb' : '#535353';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'right';

    const formattedScore = String(Math.floor(score)).padStart(5, '0');
    const formattedHI = String(Math.floor(highScore)).padStart(5, '0');

    ctx.fillText(`HI ${formattedHI}  ${formattedScore}`, canvas.width - 20, 30);
}

// --- Game Controls & Mechanics ---
function jump() {
    if (!player.isJumping && isRunning) {
        player.velocityY = -11 * playerSpeedMult;
        player.isJumping = true;
        sounds.playJump();
    }
}

function triggerBoost() {
    if (!isRunning) return;
    const now = Date.now();
    if (now - lastBoostTime >= BOOST_COOLDOWN_MS) {
        lastBoostTime = now;
        boostActiveFrames = BOOST_DURATION_FRAMES;
        sounds.playBoost();

        player.x = Math.min(320, player.x + 35);
        beyonce.x = Math.max(15, beyonce.x - 45);
    }
}

function updateBoostUI() {
    const elapsed = Date.now() - lastBoostTime;
    const progress = Math.min(1, elapsed / BOOST_COOLDOWN_MS);

    boostBar.style.width = `${progress * 100}%`;

    if (progress >= 1) {
        boostBar.classList.remove('bg-amber-500');
        boostBar.classList.add('bg-emerald-500');
        boostText.innerText = 'LISTO';
        boostText.className = 'font-bold text-emerald-600 min-w-[45px]';
    } else {
        boostBar.classList.remove('bg-emerald-500');
        boostBar.classList.add('bg-amber-500');
        const secondsLeft = ((BOOST_COOLDOWN_MS - elapsed) / 1000).toFixed(1);
        boostText.innerText = `${secondsLeft}s`;
        boostText.className = 'font-bold text-amber-600 min-w-[45px]';
    }
}

function spawnObstacle() {
    const heights = [35, 45, 55];
    const h = heights[Math.floor(Math.random() * heights.length)];
    const w = h * 0.6;

    obstacles.push({
        x: canvas.width + 20,
        y: GROUND_Y - h,
        width: w,
        height: h
    });
}

function spawnCloud() {
    clouds.push({
        x: canvas.width + 50,
        y: 30 + Math.random() * 50,
        speed: 1 + Math.random() * 0.8
    });
}

function update() {
    if (!isRunning) return;

    frameCount++;
    score += boostActiveFrames > 0 ? 0.35 : 0.15;

    // 7-second Day Cycle (Mañana -> Atardecer -> Noche)
    const elapsedTimeSec = (Date.now() - gameStartTime) / 1000;
    currentPhaseIndex = Math.floor(elapsedTimeSec / PHASE_DURATION_SEC) % PHASES.length;

    // Beyoncé Acceleration over time
    beyonceAccelerationFactor = Math.min(1.2, elapsedTimeSec * 0.018);

    if (boostActiveFrames > 0) {
        boostActiveFrames--;
    } else if (player.x > 220) {
        player.x -= 0.8;
    }

    updateBoostUI();
    gameSpeed = 5 + Math.floor(score / 100) * 0.5;

    // Jump Physics
    player.y += player.velocityY;
    player.velocityY += GRAVITY;

    if (player.y >= GROUND_Y - player.height) {
        player.y = GROUND_Y - player.height;
        player.velocityY = 0;
        player.isJumping = false;
    }

    player.legFrame++;
    beyonce.legFrame++;

    // Beyoncé Pursuit Velocity
    const effectiveBeyonceSpeed = beyonceSpeedMult + beyonceAccelerationFactor;
    const speedDelta = (effectiveBeyonceSpeed - playerSpeedMult) * 0.55;
    beyonce.x += speedDelta;

    if (beyonce.x < 15) beyonce.x = 15;

    // Collision check with Beyoncé
    if (beyonce.x + beyonce.width - 6 >= player.x) {
        gameOver('beyonce');
        return;
    }

    // Clouds Movement
    if (frameCount % 120 === 0 && Math.random() > 0.3) {
        spawnCloud();
    }
    for (let i = clouds.length - 1; i >= 0; i--) {
        clouds[i].x -= clouds[i].speed;
        if (clouds[i].x < -60) clouds.splice(i, 1);
    }

    // Obstacles Spawning & Collision
    const currentSpeed = boostActiveFrames > 0 ? gameSpeed * 1.6 : gameSpeed;
    const minObstacleInterval = Math.max(60, 130 - Math.floor(score / 50));
    if (frameCount % minObstacleInterval === 0 && Math.random() > 0.35) {
        if (obstacles.length === 0 || canvas.width - obstacles[obstacles.length - 1].x > 220) {
            spawnObstacle();
        }
    }

    for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        obs.x -= currentSpeed * playerSpeedMult;

        const pBox = { x: player.x + 4, y: player.y + 4, w: player.width - 8, h: player.height - 4 };
        const oBox = { x: obs.x + 4, y: obs.y + 4, w: obs.width - 8, h: obs.height - 4 };

        if (
            pBox.x < oBox.x + oBox.w &&
            pBox.x + pBox.w > oBox.x &&
            pBox.y < oBox.y + oBox.h &&
            pBox.y + pBox.h > oBox.y
        ) {
            gameOver('cactus');
            return;
        }

        if (obs.x < -obs.width) {
            obstacles.splice(i, 1);
        }
    }
}

function render() {
    drawEnvironment();
    drawClouds();
    drawObstacles();
    drawPlayer();
    drawBeyonce();
    drawPhaseShading();
    drawScore();
}

function gameLoop() {
    update();
    render();
    if (isRunning) {
        requestAnimationFrame(gameLoop);
    }
}

function startGame() {
    score = 0;
    frameCount = 0;
    gameSpeed = 5;
    obstacles = [];
    clouds = [];
    lastBoostTime = 0;
    boostActiveFrames = 0;

    gameStartTime = Date.now();
    beyonceAccelerationFactor = 0;
    currentPhaseIndex = 0;

    player.x = 220;
    player.y = GROUND_Y - player.height;
    player.velocityY = 0;
    player.isJumping = false;

    beyonce.x = 40;
    beyonce.y = GROUND_Y - beyonce.height;

    isRunning = true;
    gameOverScreen.classList.add('hidden');
    updateBoostUI();

    spawnCloud();
    clouds[0].x = 300;

    requestAnimationFrame(gameLoop);
}

function gameOver(reason) {
    isRunning = false;

    if (score > highScore) {
        highScore = score;
        saveHighScore(highScore);
    }

    if (reason === 'cactus') {
        sounds.playCactusHit();
        gameOverTitle.innerText = "G A M E  O V E R";
        gameOverReason.innerText = "¡Tropiezo fatal con un cactus!";
    } else if (reason === 'beyonce') {
        sounds.playBeyonceCatch();
        gameOverTitle.innerText = "¡CAPTURADO!";
        gameOverReason.innerText = "¡Beyoncé te ha alcanzado!";
    }

    restartBtn.innerText = "↻ REINTENTAR";
    gameOverScreen.classList.remove('hidden');
}

// --- Event Listeners ---
window.addEventListener('keydown', (e) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        e.preventDefault();
        triggerBoost();
    } else if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (!isRunning) {
            startGame();
        } else {
            jump();
        }
    }
});

restartBtn.addEventListener('click', () => {
    startGame();
});

touchJumpBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!isRunning) {
        startGame();
    } else {
        jump();
    }
});

touchBoostBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (isRunning) {
        triggerBoost();
    }
});

canvas.addEventListener('click', () => {
    if (!isRunning) {
        startGame();
    } else {
        jump();
    }
});

// Initialize canvas preview rendering on window load
window.addEventListener('load', () => {
    drawEnvironment();
    drawClouds();
    drawPlayer();
    drawBeyonce();
    drawScore();
});
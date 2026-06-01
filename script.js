var canvas = document.querySelector('#main-board');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var cols = 8;
var rows = 4;
var cellwidth = window.innerWidth / 8;
var cellHeight = window.innerHeight / 4;
let x, y;

var player = {
    X: 0,
    Y: window.innerHeight / 2,
    color: '#DC143C',
    size: 20,
    hp: 200,
    maxHp: 200
};

var currentCell = { row: null, col: null };

let mouseX = 0;
let mouseY = 0;
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

class Door {
    constructor(x, y, width, height) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
    }
}

class gunType {
    constructor(range, ammo) {
        this.range = range;
        this.ammo = ammo;
    }
}

class Cannon {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.color = '#DC143C';
        this.size = 30;
        this.hp = 100;
        this.maxHp = 100;
    }
}

class Cell {
    constructor(row, col, x, y, w, h) {
        this.row = row;
        this.col = col;
        this.door = new Door(x, y, w, h);
    }
}

class Bullet {
    constructor(x, y, size, dirX, dirY) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.dirX = dirX;
        this.dirY = dirY;
        this.bounces = 0;
        this.isColling = bulletCollidingWithWall;
    }
}

var doors = [];
let cells = [];
let cannons = [];
let bullets = [];
let botBullets = [];
let bulletCollidingWithWall = false;

let particles = [];
class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.dirX = (Math.random() - 0.5) * 4;
        this.dirY = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.size = Math.random() * 3 + 1;
    }
}

function grid() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            x = cellwidth * j + cellwidth / 6;
            y = cellHeight * i + cellHeight / 6;
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(x, y, (2 / 3) * cellwidth, (2 / 3) * cellHeight);
            ctx.strokeStyle = '#444';
            ctx.strokeRect(x, y, (2 / 3) * cellwidth, (2 / 3) * cellHeight);
        }
    }
}

function constructPlayer() {
    ctx.fillStyle = '#DC143C';
    ctx.fillRect(player.X, player.Y, player.size, player.size);
    drawHealthBar(player.X, player.Y - 7, player.size, player.hp, player.maxHp);
}

var speed = 4;

const keys = {};
window.addEventListener('keydown', (e) => { keys[e.key] = true; });
window.addEventListener('keyup',   (e) => { keys[e.key] = false; });

let lastPlayerShot = 0;
window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const now = Date.now();
    if (now - lastPlayerShot < 250) return;
    lastPlayerShot = now;
    let dx = mouseX - player.X;
    let dy = mouseY - player.Y;
    let len = Math.sqrt(dx * dx + dy * dy);
    bullets.push(new Bullet(player.X, player.Y, 5, (dx / len) * 2, (dy / len) * 2));
    new Audio('media/playerFire.mp3').play();
});

function movement() {
    if (keys['ArrowUp']    || keys['w']) { var px = player.X, py = player.Y; player.Y -= speed; if (createBoundary()) { player.X = px; player.Y = py; } }
    if (keys['ArrowDown']  || keys['s']) { var px = player.X, py = player.Y; player.Y += speed; if (createBoundary()) { player.X = px; player.Y = py; } }
    if (keys['ArrowRight'] || keys['d']) { var px = player.X, py = player.Y; player.X += speed; if (createBoundary()) { player.X = px; player.Y = py; } }
    if (keys['ArrowLeft']  || keys['a']) { var px = player.X, py = player.Y; player.X -= speed; if (createBoundary()) { player.X = px; player.Y = py; } }
}

function createGun() {
    cannons = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let cellX = cellwidth * j + cellwidth / 6;
            let cellY = cellHeight * i + cellHeight / 6;
            const size = 30;
            const margin = 40;
            const innerW = (2 / 3) * cellwidth  - size - margin * 2;
            const innerH = (2 / 3) * cellHeight - size - margin * 2;
            let dx = cellX + margin + Math.random() * innerW;
            let dy = cellY + margin + Math.random() * innerH;
            cannons.push(new Cannon(dx, dy));
        }
    }
}

var lastShoot = 0;

function handleBotShooting() {
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let index = i * cols + j;
            let cannon = cannons[index];
            if (cannon.hp <= 0) continue;

            let cellX = cellwidth * j + cellwidth / 6;
            let cellY = cellHeight * i + cellHeight / 6;
            let inCell = (
                player.X + player.size > cellX &&
                player.X < cellX + (2 / 3) * cellwidth &&
                player.Y + player.size > cellY &&
                player.Y < cellY + (2 / 3) * cellHeight
            );

            const cooldown = handleBotShooting._cooldown || 2000;
            let now = Date.now();
            if (inCell && now - lastShoot >= cooldown) {
                let cx = player.X - cannon.x;
                let cy = player.Y - cannon.y;
                let len = Math.sqrt(cx * cx + cy * cy);
                botBullets.push(new Bullet(cannon.x, cannon.y, 5, (cx / len) * 3, (cy / len) * 3));
                lastShoot = now;
                new Audio('media/cannonFire.mp3').play();
            }
        }
    }
}

function spawnParticles(x, y) {
    for (let k = 0; k < 6; k++) particles.push(new Particle(x, y));
}

function reflectInside(bullet, x, y) {
    const cw = (2/3) * cellwidth;
    const ch = (2/3) * cellHeight;
    const t  = bullet.size;

    const hitLeft   = bullet.x <= x + t             && bullet.dirX < 0;
    const hitRight  = bullet.x + t >= x + cw - t    && bullet.dirX > 0;
    const hitTop    = bullet.y <= y + t              && bullet.dirY < 0;
    const hitBottom = bullet.y + t >= y + ch - t     && bullet.dirY > 0;

    if (!hitLeft && !hitRight && !hitTop && !hitBottom) return;

    if (hitLeft)   { bullet.dirX =  Math.abs(bullet.dirX); bullet.x = x + t + 1; }
    if (hitRight)  { bullet.dirX = -Math.abs(bullet.dirX); bullet.x = x + cw - t * 2 - 1; }
    if (hitTop)    { bullet.dirY =  Math.abs(bullet.dirY); bullet.y = y + t + 1; }
    if (hitBottom) { bullet.dirY = -Math.abs(bullet.dirY); bullet.y = y + ch - t * 2 - 1; }

    bullet.bounces++;
    spawnParticles(bullet.x, bullet.y);
}

function reflectOutside(bullet, x, y) {
    const cw = (2/3) * cellwidth;
    const ch = (2/3) * cellHeight;
    const t  = bullet.size;
    const threshold = t + 2;
    const withinX = bullet.x + t >= x && bullet.x <= x + cw;
    const withinY = bullet.y + t >= y && bullet.y <= y + ch;

    const hitLeft   = withinY && bullet.x + t >= x - threshold && bullet.x + t <= x + 2  && bullet.dirX > 0;
    const hitRight  = withinY && bullet.x <= x + cw + threshold && bullet.x >= x + cw - 2 && bullet.dirX < 0;
    const hitTop    = withinX && bullet.y + t >= y - threshold  && bullet.y + t <= y + 2  && bullet.dirY > 0;
    const hitBottom = withinX && bullet.y <= y + ch + threshold && bullet.y >= y + ch - 2 && bullet.dirY < 0;

    if (!hitLeft && !hitRight && !hitTop && !hitBottom) return;

    if (hitLeft)   { bullet.dirX = -Math.abs(bullet.dirX); bullet.x = x - t - 1; }
    if (hitRight)  { bullet.dirX =  Math.abs(bullet.dirX); bullet.x = x + cw + 1; }
    if (hitTop)    { bullet.dirY = -Math.abs(bullet.dirY); bullet.y = y - t - 1; }
    if (hitBottom) { bullet.dirY =  Math.abs(bullet.dirY); bullet.y = y + ch + 1; }

    bullet.bounces++;
    spawnParticles(bullet.x, bullet.y);
}

function bulletRadar() {
    const maxBounces = 3;

    bullets = bullets.filter(bullet => {
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) return false;
        if (bullet.bounces >= maxBounces) return false;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let cx = cellwidth * j + cellwidth / 6;
                let cy = cellHeight * i + cellHeight / 6;
                const cw = (2/3) * cellwidth;
                const ch = (2/3) * cellHeight;
                const insideCell = (
                    bullet.x > cx && bullet.x + bullet.size < cx + cw &&
                    bullet.y > cy && bullet.y + bullet.size < cy + ch
                );
                if (insideCell) {
                    reflectInside(bullet, cx, cy);
                } else {
                    reflectOutside(bullet, cx, cy);
                }
            }
        }
        return true;
    });

    botBullets = botBullets.filter(bullet => {
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) return false;
        if (bullet.bounces >= maxBounces) return false;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let cx = cellwidth * j + cellwidth / 6;
                let cy = cellHeight * i + cellHeight / 6;
                if (bullet.x + bullet.size > cx && bullet.x < cx + (2/3) * cellwidth &&
                    bullet.y + bullet.size > cy && bullet.y < cy + (2/3) * cellHeight) {
                    reflectInside(bullet, cx, cy);
                    return true;
                }
            }
        }
        return true;
    });
}

function createDoors() {
    doors = [];
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            let cellX = cellwidth * j + cellwidth / 6;
            let cellY = cellHeight * i + cellHeight / 6;
            let w = (2 / 3) * cellwidth;
            let h = (2 / 3) * cellHeight;
            let side = Math.floor(Math.random() * 4);
            let dx, dy, dw, dh;

            if      (side === 0) { dx = cellX + w / 2 - 15; dy = cellY;          dw = 50; dh = 10; }
            else if (side === 1) { dx = cellX + w / 2 - 15; dy = cellY + h - 10; dw = 50; dh = 10; }
            else if (side === 2) { dx = cellX;               dy = cellY + h/2-25; dw = 10; dh = 50; }
            else                 { dx = cellX + w - 10;      dy = cellY + h/2-25; dw = 10; dh = 50; }

            doors.push(new Door(dx, dy, dw, dh));
            cells.push(new Cell(i, j, dx, dy, dw, dh));
        }
    }
}

function createBoundary() {
    speed = 4;
    for (let i = 0; i < rows; i++) {
        for (let j = 0; j < cols; j++) {
            x = cellwidth * j + cellwidth / 6;
            y = cellHeight * i + cellHeight / 6;

            if (player.X + player.size > x && player.X < x + (2/3) * cellwidth &&
                player.Y + player.size > y && player.Y < y + (2/3) * cellHeight) {

                let door = doors[i * cols + j];
                let onDoor = (
                    player.X + player.size > door.x && player.X < door.x + door.width &&
                    player.Y + player.size > door.y && player.Y < door.y + door.height
                );

                if (currentCell.row == i && currentCell.col == j) {
                    let onWall = (
                        player.X < x + 1 ||
                        player.X + player.size > x + (2/3) * cellwidth - 1 ||
                        player.Y < y + 1 ||
                        player.Y + player.size > y + (2/3) * cellHeight - 1
                    );
                    if (onWall && !onDoor) return true;
                    if (onWall && onDoor) { currentCell.row = null; currentCell.col = null; }
                    return false;
                }

                if (onDoor) { currentCell.row = i; currentCell.col = j; return false; }
                return true;
            }
        }
    }
    return false;
}

const fogCanvas = document.createElement('canvas');
fogCanvas.width  = canvas.width;
fogCanvas.height = canvas.height;
const fogCtx = fogCanvas.getContext('2d');

function drawVision() {
    const px = player.X + player.size / 2;
    const py = player.Y + player.size / 2;
    const radius = 200;

    fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    fogCtx.fillStyle = 'rgba(0,0,0,0.92)';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);

    fogCtx.globalCompositeOperation = 'destination-out';
    const grad = fogCtx.createRadialGradient(px, py, 0, px, py, radius);
    grad.addColorStop(0,    'rgba(0,0,0,1)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.9)');
    grad.addColorStop(1,    'rgba(0,0,0,0)');
    fogCtx.fillStyle = grad;
    fogCtx.beginPath();
    fogCtx.arc(px, py, radius, 0, Math.PI * 2);
    fogCtx.fill();
    fogCtx.globalCompositeOperation = 'source-over';

    ctx.drawImage(fogCanvas, 0, 0);
}

function drawHealthBar(x, y, w, hp, maxHp) {
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, w, 4);
    ctx.fillStyle = '#2ecc40';
    ctx.fillRect(x, y, w * (hp / maxHp), 4);
}

function checkHits() {
    botBullets = botBullets.filter(bullet => {
        const hit = (
            bullet.x + bullet.size > player.X && bullet.x < player.X + player.size &&
            bullet.y + bullet.size > player.Y && bullet.y < player.Y + player.size
        );
        if (!hit) return true;
        if (activeShield > 0) activeShield--;
        else player.hp = Math.max(0, player.hp - 20);
        spawnParticles(bullet.x, bullet.y);
        return false;
    });

    bullets = bullets.filter(bullet => {
        for (let c = 0; c < cannons.length; c++) {
            let cannon = cannons[c];
            const hit = (
                bullet.x + bullet.size > cannon.x && bullet.x < cannon.x + cannon.size &&
                bullet.y + bullet.size > cannon.y && bullet.y < cannon.y + cannon.size
            );
            if (!hit) continue;
            const wasAlive = cannon.hp > 0;
            cannon.hp = Math.max(0, cannon.hp - 20);
            spawnParticles(bullet.x, bullet.y);
            if (wasAlive && cannon.hp <= 0 && Math.random() < 0.5) {
                const type = Math.random() < 0.5 ? 'shield' : 'regen';
                groundPowerups.push(new Powerup(cannon.x + cannon.size / 2, cannon.y + cannon.size / 2, type));
            }
            return false;
        }
        return true;
    });
}

let paused = false;
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        paused = !paused;
        new Audio('media/pause.mp3').play();
        if (!paused) window.requestAnimationFrame(update);
    }
});

function update() {
    if (paused) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = 'white';
        ctx.font = 'bold 56px sans-serif';
        ctx.fillText('PAUSED', canvas.width / 2, canvas.height / 2 - 20);
        ctx.font = '22px sans-serif';
        ctx.fillStyle = 'grey';
        ctx.fillText('ESC to resume', canvas.width / 2, canvas.height / 2 + 24);
        return;
    }

    if (gameState === 'wellplayed') { drawWellPlayed(); return; }
    if (gameState === 'dead')       { drawGG(); return; }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    movement();
    grid();

    doors.forEach(door => {
        ctx.fillStyle = 'yellow';
        ctx.fillRect(door.x, door.y, door.width, door.height);
    });

    cannons.forEach(cannon => {
        if (cannon.hp <= 0) return;
        ctx.fillStyle = cannon.color;
        ctx.fillRect(cannon.x, cannon.y, cannon.size, cannon.size);
        drawHealthBar(cannon.x, cannon.y - 7, cannon.size, cannon.hp, cannon.maxHp);
    });

    handleBotShooting();

    bullets.forEach(bullet => {
        bullet.x += bullet.dirX;
        bullet.y += bullet.dirY;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    });

    botBullets.forEach(bullet => {
        bullet.x += bullet.dirX;
        bullet.y += bullet.dirY;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, bullet.size, 0, Math.PI * 2);
        ctx.fillStyle = 'yellow';
        ctx.fill();
    });

    checkHits();
    bulletRadar();

    particles = particles.filter(p => p.life > 0);
    particles.forEach(p => {
        p.x += p.dirX;
        p.y += p.dirY;
        p.life -= 0.05;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 200, 50, ${p.life})`;
        ctx.fill();
    });

    updatePowerups();
    drawGroundPowerups();
    constructPlayer();
    drawShieldAura();
    drawVision();
    drawPowerupHUD();

    if (cannons.every(c => c.hp <= 0)) {
        gameState = 'wellplayed';
        new Audio('media/nextLevel.mp3').play();
        setTimeout(nextLevel, 2000);
    }
    if (player.hp <= 0) {
        gameState = 'dead';
        new Audio('media/gameOver.mp3').play();
    }

    window.requestAnimationFrame(update);
}

let level = parseInt(sessionStorage.getItem('level') || '1');
let gameState = 'playing';

function resetLevel() {
    bullets = [];
    botBullets = [];
    particles = [];
    groundPowerups = [];
    activeShield = 0;
    regenActive = false;
    cells = [];
    player.X = 0;
    player.Y = window.innerHeight / 2;
    currentCell.row = null;
    currentCell.col = null;
    createDoors();
    createGun();
}

function scaleDifficulty() {
    lastShoot = 0;
    const shootCooldown = Math.max(300, 800 - (level - 1) * 60);
    handleBotShooting._cooldown = shootCooldown;
    cannons.forEach(c => {
        c.hp = Math.round(80 * Math.pow(1.2, level - 1));
        c.maxHp = c.hp;
    });
}

function nextLevel() {
    level++;
    sessionStorage.setItem('level', level);
    resetLevel();
    player.hp = player.maxHp;
    scaleDifficulty();
    gameState = 'playing';
}

function retryFromDeath() {
    level = 1;
    sessionStorage.setItem('level', level);
    player.hp = player.maxHp;
    resetLevel();
    gameState = 'playing';
    window.requestAnimationFrame(update);
}

function drawWellPlayed() {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#2ecc40';
    ctx.font = 'bold 80px sans-serif';
    ctx.fillText('Well played', canvas.width / 2, canvas.height / 2 - 20);
    ctx.fillStyle = '#aaa';
    ctx.font = '22px monospace';
    ctx.fillText(`Level ${level} — loading level ${level + 1}…`, canvas.width / 2, canvas.height / 2 + 40);
    window.requestAnimationFrame(update);
}

function drawGG() {
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#e74c3c';
    ctx.font = 'bold 100px sans-serif';
    if(level==1){
        ctx.fillStyle = 'rgba(0,0,0,0.82)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c';
        ctx.font = 'bold 100px sans-serif';
        ctx.fillText('LMAO.', canvas.width / 2, canvas.height / 2 - 30);
        ctx.fillStyle = '#fff';
        ctx.font = '20px sans-serif';
        ctx.fillText('R or click to retry', canvas.width / 2, canvas.height / 2 + 72);
        return;
    }
    ctx.fillText('GG.', canvas.width / 2, canvas.height / 2 - 30);
    ctx.fillStyle = '#aaa';
    ctx.font = '22px monospace';
    ctx.fillText(`Every level serves as a checkpoint btw unless you didn't even clear the first one (skill issue). Try again :)`, canvas.width / 2, canvas.height / 2 + 30);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.fillText('R or click to retry', canvas.width / 2, canvas.height / 2 + 72);
}

window.addEventListener('keydown', (e) => {
    if ((e.key === 'r' || e.key === 'R') && gameState === 'dead') retryFromDeath();
});
window.addEventListener('click', () => {
    if (gameState === 'dead') retryFromDeath();
});

class Powerup {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.size = 14;
        this.pulse = 0;
    }
}

let groundPowerups = [];
let activeShield = 0;
let regenActive = false;
let regenEnd = 0;
let regenTick = 0;

const REGEN_DURATION = 10000;
const REGEN_INTERVAL = 500;
const REGEN_AMOUNT = 2;
const SHIELD_HITS = 3;

const shieldColor = '#5ba4f5';
const regenColor  = '#44dd88';

function drawGroundPowerups() {
    groundPowerups.forEach(p => {
        p.pulse = (p.pulse + 0.08) % (Math.PI * 2);
        const glow = 0.5 + 0.5 * Math.sin(p.pulse);
        const color = p.type === 'shield' ? shieldColor : regenColor;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size + 4 * glow, 0, Math.PI * 2);
        ctx.fillStyle = color + '33';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.type === 'shield' ? 'S' : 'R', p.x, p.y);
        ctx.textBaseline = 'alphabetic';
    });
}

function updatePowerups() {
    const now = Date.now();

    groundPowerups = groundPowerups.filter(p => {
        const dx = (player.X + player.size / 2) - p.x;
        const dy = (player.Y + player.size / 2) - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < p.size + player.size / 2) {
            if (p.type === 'shield') {
                activeShield = SHIELD_HITS;
            } else {
                regenActive = true;
                regenEnd = now + REGEN_DURATION;
                regenTick = now;
            }
            new Audio('media/equipped.mp3').play();
            return false;
        }
        return true;
    });

    if (regenActive) {
        if (now > regenEnd) {
            regenActive = false;
        } else if (now - regenTick >= REGEN_INTERVAL) {
            player.hp = Math.min(player.maxHp, player.hp + REGEN_AMOUNT);
            regenTick = now;
        }
    }
}

function drawShieldAura() {
    if (activeShield <= 0) return;
    const px = player.X + player.size / 2;
    const py = player.Y + player.size / 2;
    const flicker = 0.4 + 0.3 * Math.sin(Date.now() / 150);
    ctx.beginPath();
    ctx.arc(px, py, player.size + 8, 0, Math.PI * 2);
    ctx.strokeStyle = shieldColor + Math.round(flicker * 255).toString(16).padStart(2, '0');
    ctx.lineWidth = 3;
    ctx.stroke();
}

function drawPowerupHUD() {
    const x = 14;
    const y = 58;
    ctx.font = 'bold 11px monospace';
    ctx.textAlign = 'left';

    if (activeShield > 0) {
        ctx.fillStyle = shieldColor + 'cc';
        ctx.fillRect(x, y, 70, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText(`SHIELD  ${activeShield}`, x + 4, y + 14);
    }

    if (regenActive) {
        const frac = Math.max(0, regenEnd - Date.now()) / REGEN_DURATION;
        const offsetX = x + (activeShield > 0 ? 78 : 0);
        ctx.fillStyle = regenColor + 'cc';
        ctx.fillRect(offsetX, y, 70 * frac, 20);
        ctx.strokeStyle = regenColor + '88';
        ctx.lineWidth = 1;
        ctx.strokeRect(offsetX, y, 70, 20);
        ctx.fillStyle = '#fff';
        ctx.fillText('REGEN', offsetX + 4, y + 14);
    }
}

createDoors();
createGun();
window.requestAnimationFrame(update);
/**
 * REVERSED ROLES – العالم تحت سيطرتك
 * 3-Stage Aladdin Game — Drag-based mechanics
 */

// ===== SOUND =====
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
const Sound = {
    tone(f, type, dur, vol) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type; o.frequency.setValueAtTime(f, audioCtx.currentTime);
        g.gain.setValueAtTime(vol, audioCtx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + dur);
        o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + dur);
    },
    whoosh() { this.tone(300, 'sine', 0.2, 0.08); setTimeout(() => this.tone(500, 'sine', 0.15, 0.06), 50); },
    collect(t) { const b = t === 'cursed' ? 200 : 800; this.tone(b, 'sine', 0.4, 0.1); setTimeout(() => this.tone(b * 1.5, 'sine', 0.3, 0.07), 60); },
    crash() { this.tone(80, 'sawtooth', 0.5, 0.25); },
    hit() { this.tone(600, 'square', 0.15, 0.1); setTimeout(() => this.tone(900, 'sine', 0.2, 0.08), 80); },
    reflect() { this.tone(700, 'sine', 0.2, 0.1); setTimeout(() => this.tone(1000, 'sine', 0.15, 0.07), 60); },
    victory() { [0, 100, 200, 300, 400].forEach((d, i) => setTimeout(() => this.tone(400 + i * 100, 'sine', 0.4, 0.08), d)); },
    stageWin() { this.tone(500, 'sine', 0.3, 0.1); setTimeout(() => this.tone(700, 'sine', 0.4, 0.08), 150); }
};

// ===== CANVAS =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
let W, H;
function resize() { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
window.addEventListener('resize', resize); resize();

// ===== LOAD CARPET IMAGE =====
const carpetImg = new Image(); carpetImg.src = 'carpet.png';
let carpetLoaded = false; carpetImg.onload = () => { carpetLoaded = true; };

const bossImg = new Image(); bossImg.src = 'boss.png';
let bossLoaded = false; bossImg.onload = () => { bossLoaded = true; };

const cloudImg = new Image(); cloudImg.src = 'cloud.png';
let cloudLoaded = false; cloudImg.onload = () => { cloudLoaded = true; };

const mirrorImg = new Image(); mirrorImg.src = 'M.png';
let mirrorLoaded = false; mirrorImg.onload = () => { mirrorLoaded = true; };

const xImg = new Image(); xImg.src = 'x.png';
let xLoaded = false; xImg.onload = () => { xLoaded = true; };

// ===== DIALOGUES =====
const DIALOGUES = {
    stage1: [
        { speaker: 'علاء الدين', emoji: '🧞', text: 'ياسمين! المصباح تحطم.. المدينة تنهار من تحتنا!', audio: 'Video Project 8.m4a' },
        { speaker: 'ياسمين', emoji: '👸', text: 'لا وقت للذعر يا علاء! سأشق لك طريقاً بين الركام.. ارفع هذه الأعمدة بيدك أو اخفضها، بسرعة قبل أن نصطدم!', audio: 'Video Project 9.m4a' }
    ],
    stage2: [
        { speaker: 'ياسمين', emoji: '👸', text: 'انتبه! نيران الجن تطاردنا من الأسفل.. لن تدعنا نصطدم!', audio: 'Video Project 10.m4a' },
        { speaker: 'علاء الدين', emoji: '🧞', text: 'ياسمين، سحركِ هو درعنا الوحيد الآن!', audio: 'Video Project 13.m4a' },
        { speaker: 'ياسمين', emoji: '👸', text: 'إذن راقب يدي! اسحب الغيوم السحرية واجعلها سداً منيعاً.. لن تلمسك شعرة من نار وهم معي!', audio: 'Video Project 11.m4a' }
    ],
    stage3: [
        { speaker: 'علاء الدين', emoji: '🧞', text: 'وصلنا لقصر المرايا.. لكن الظل يحيط بنا، سحره البنفسجي يمتص الضوء!', audio: 'Video Project 14.m4a' },
        { speaker: 'ياسمين', emoji: '👸', text: 'الظلال تخشى الضوء دائماً! وجّه هذه المرايا الذهبية نحوه.. اقلب سحره عليه واجعله يذوق وبال أمره!', audio: 'Video Project 12.m4a' }
    ],
    victory: [
        { speaker: 'ياسمين', emoji: '👸', text: 'رأيت؟ حتى الظلام ينحني أمام قلبين لا يعرفان الخوف! 💛', audio: 'Video Project 16.m4a' },
        { speaker: 'علاء الدين', emoji: '🧞', text: 'بغداد تنفس الصعداء مجدداً.. لم أكن لأفعلها لولا شجاعتكِ.', audio: 'Video Project 15.m4a' }
    ]
};

// ===== GAME STATE =====
const G = {
    stage: 0, score: 0, playing: false, over: false,
    time: 0, lastTime: 0,
    // Stage 1
    pillars: [], carpetX: 0, carpetY: 0, carpetBaseY: 0, pillarsPassed: 0, spawnTimer: 0,
    vOffset: 0, // vertical offset controlled by arrows
    input: { up: false, down: false },
    // Stage 2
    shields: [], fireballs: [], health: 100, levelTime: 0,
    // Stage 3
    boss: null, mirror: null, magicBalls: [],
    // Stars
    stars: [],
    // Drag (for stages 2 & 3)
    isDragging: false, dragTarget: null,
    // Dialogue
    dialogueQueue: [], dialogueIdx: 0, typing: false, typedText: '', typeInterval: null, dialogueCb: null,
    currentDialogueAudio: null, // Audio object for current dialogue
    shakeTime: 0
};

// ===== HELPERS =====
const rand = (a, b) => Math.random() * (b - a) + a;
const dist2 = (ax, ay, bx, by) => Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// ===== STARS =====
function initStars() {
    G.stars = [];
    for (let i = 0; i < 100; i++) G.stars.push({ x: rand(0, W), y: rand(0, H), s: rand(0.5, 2.5), a: rand(0.2, 1), sp: rand(5, 20) });
}
function updateStars(dt) { G.stars.forEach(s => { s.x -= s.sp * dt; if (s.x < 0) { s.x = W; s.y = rand(0, H); } }); }
function drawStars() { G.stars.forEach(s => { ctx.globalAlpha = s.a * (0.5 + 0.5 * Math.sin(G.time * 2 + s.x)); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x, s.y, s.s, 0, Math.PI * 2); ctx.fill(); }); ctx.globalAlpha = 1; }

// ===== DRAW CARPET + CHARACTER =====
function drawCarpet(x, y) {
    ctx.save();
    const wobble = Math.sin(G.time * 5) * 3;
    ctx.translate(x, y + wobble);
    if (carpetLoaded) {
        // Draw the Jasmine carpet image, centered and scaled
        const imgW = 160;
        const imgH = imgW * (carpetImg.height / carpetImg.width);
        ctx.drawImage(carpetImg, -imgW / 2, -imgH / 2 - 10, imgW, imgH);
    } else {
        // Fallback: simple colored carpet
        ctx.fillStyle = '#663399';
        ctx.beginPath(); ctx.roundRect(-60, -18, 120, 36, 10); ctx.fill();
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#e0ac69';
        ctx.beginPath(); ctx.arc(0, -32, 12, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

const bImg = new Image(); bImg.src = 'b.png';
let bLoaded = false; bImg.onload = () => { bLoaded = true; };

// ===== DRAW PILLAR =====
function drawPillar(p, vo) {
    ctx.save();
    const gy = p.gapY + (vo || 0);
    const topH = gy - p.gapSize / 2;
    const botY = gy + p.gapSize / 2;

    if (bLoaded) {
        // Draw pillar image (b.png)
        const imgW = p.width + 220; // Very Wide
        const offset = (imgW - p.width) / 2;
        // Draw top part (inverted)
        if (topH > 0) {
            ctx.save();
            ctx.translate(p.x + p.width / 2, topH);
            ctx.scale(1, -1); // Flip vertically
            ctx.drawImage(bImg, -imgW / 2, 0, imgW, 600);
            ctx.restore();
        }
        // Draw bottom part
        if (botY < H) {
            ctx.drawImage(bImg, p.x - offset, botY, imgW, 600);
        }
    } else {
        // Fallback: Original drawing code
        ctx.shadowBlur = 12; ctx.shadowColor = 'rgba(0,0,0,0.6)';
        const grad = ctx.createLinearGradient(p.x, 0, p.x + p.width, 0);
        grad.addColorStop(0, '#d4af37'); grad.addColorStop(0.5, '#e8d3b9'); grad.addColorStop(1, '#d4af37');
        ctx.fillStyle = grad;
        ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3;

        // Top
        if (topH > 0) {
            ctx.fillRect(p.x, 0, p.width, topH);
            ctx.strokeRect(p.x, -5, p.width, topH + 5);
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.arc(p.x + p.width / 2, topH, p.width / 2 + 5, Math.PI, 0); ctx.fill();
            ctx.fillStyle = 'rgba(212,175,55,0.25)';
            for (let py = 30; py < topH - 15; py += 45) { ctx.beginPath(); ctx.arc(p.x + p.width / 2, py, 10, 0, Math.PI * 2); ctx.fill(); }
        }
        // Bottom
        ctx.fillStyle = grad;
        if (botY < H) {
            ctx.fillRect(p.x, botY, p.width, H - botY);
            ctx.strokeRect(p.x, botY, p.width, H - botY + 5);
            ctx.fillStyle = '#c0392b';
            ctx.beginPath(); ctx.arc(p.x + p.width / 2, botY, p.width / 2 + 5, 0, Math.PI); ctx.fill();
        }
    }
    ctx.restore();
}

// ===== DRAW CLOUD SHIELD =====
function drawCloud(s) {
    if (!s.isActive) return;
    ctx.save(); ctx.translate(s.x, s.y);

    if (cloudLoaded) {
        // Draw cloud image
        const imgW = s.radius * 2.8; // Scale cloud appropriately
        const imgH = imgW * (cloudImg.height / cloudImg.width);
        ctx.shadowBlur = s.isDragging ? 25 : 15;
        ctx.shadowColor = s.isDragging ? '#d4af37' : '#fff';
        ctx.drawImage(cloudImg, -imgW / 2, -imgH / 2, imgW, imgH);
    } else {
        // Fallback: Code-drawn cloud
        ctx.fillStyle = s.isDragging ? 'rgba(212,175,55,0.85)' : 'rgba(232,211,185,0.75)';
        ctx.shadowBlur = 20; ctx.shadowColor = s.isDragging ? '#d4af37' : '#e8d3b9';
        const r = s.radius;
        [{ x: 0, y: 0, r: r }, { x: -r * 0.55, y: r * 0.2, r: r * 0.65 }, { x: r * 0.55, y: r * 0.2, r: r * 0.65 }, { x: 0, y: -r * 0.35, r: r * 0.75 }].forEach(c => {
            ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2); ctx.fill();
        });
    }
    ctx.restore();
}

// ===== DRAW MIRROR =====
function drawMirror(m) {
    ctx.save(); ctx.translate(m.x, m.y);

    if (mirrorLoaded) {
        // Draw Mirror Image (M.png)
        const scale = 0.25; // Smaller
        const imgW = mirrorImg.width * scale;
        const imgH = mirrorImg.height * scale;

        ctx.shadowBlur = m.isDragging ? 25 : 15;
        ctx.shadowColor = m.isDragging ? '#f1c40f' : '#d4af37';

        ctx.drawImage(mirrorImg, -imgW / 2, -imgH / 2, imgW, imgH);
    } else {
        // Fallback: Original Code
        // Frame
        ctx.strokeStyle = m.isDragging ? '#f1c40f' : '#d4af37';
        ctx.lineWidth = m.isDragging ? 6 : 4;
        ctx.shadowBlur = 18; ctx.shadowColor = '#d4af37';
        ctx.strokeRect(-m.radius, -m.radius / 2, m.radius * 2, m.radius);
        // Mirror surface
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, m.radius);
        grad.addColorStop(0, 'rgba(133,193,233,0.8)'); grad.addColorStop(1, 'rgba(46,134,193,0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(-m.radius + 4, -m.radius / 2 + 4, m.radius * 2 - 8, m.radius - 8);
        // Sparkle
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.beginPath(); ctx.arc(-m.radius * 0.3, -m.radius * 0.1, 5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ===== DRAW SHADOW BOSS =====
function drawBoss(b) {
    ctx.save(); ctx.translate(b.x, b.y);
    const s = 1 + Math.sin(b.pulse) * 0.05;
    ctx.scale(s, s);

    if (bossLoaded) {
        // Draw boss image with glow
        ctx.shadowBlur = 30; ctx.shadowColor = '#8e44ad';
        const imgW = 220;
        const imgH = imgW * (bossImg.height / bossImg.width);
        ctx.drawImage(bossImg, -imgW / 2, -imgH / 2, imgW, imgH);
        ctx.shadowBlur = 0;
    } else {
        // Fallback: Menacing Shadow Wizard (Jafar style)
        // Staff
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(40, 20); ctx.lineTo(40, -60); ctx.stroke();
        ctx.beginPath(); ctx.arc(40, -65, 8, 0, Math.PI * 2); ctx.fillStyle = '#c0392b'; ctx.fill();
        // Cloak / Robes
        ctx.fillStyle = '#1a0a2e';
        ctx.beginPath(); ctx.moveTo(0, -70); ctx.quadraticCurveTo(55, 0, 45, 90); ctx.lineTo(-45, 90); ctx.quadraticCurveTo(-55, 0, 0, -70); ctx.fill();
        // Inner Robe
        ctx.fillStyle = '#4a0e4e';
        ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(15, 90); ctx.lineTo(-15, 90); ctx.fill();
        // Face
        ctx.fillStyle = '#a9a9a9'; // Ashen skin
        ctx.beginPath(); ctx.ellipse(0, -50, 18, 25, 0, 0, Math.PI * 2); ctx.fill();
        // Beard
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.moveTo(-5, -30); ctx.quadraticCurveTo(0, -10, 5, -30); ctx.lineTo(0, -25); ctx.fill();
        // Eyes
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath(); ctx.ellipse(-6, -52, 5, 2, 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(6, -52, 5, 2, -0.2, 0, Math.PI * 2); ctx.fill();
        // Turban
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.ellipse(0, -65, 22, 12, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(0, -72, 6, 0, Math.PI * 2); ctx.fill(); // Ruby
        ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.stroke();
    }

    // Evil aura (always drawn)
    for (let i = 0; i < 5; i++) {
        const a = b.pulse + i * 1.3;
        ctx.beginPath(); ctx.arc(Math.cos(a) * 60, Math.sin(a) * 60, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(142,68,173,${0.3 + Math.sin(a) * 0.2})`; ctx.fill();
    }
    ctx.restore();
    // Health bar
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(b.x - 80, b.y - 100, 160, 14);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(b.x - 80, b.y - 100, (b.health / b.maxHealth) * 160, 14);
    ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2;
    ctx.strokeRect(b.x - 80, b.y - 100, 160, 14);
}

// ===== SCREEN MANAGEMENT =====
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    const el = document.getElementById(id);
    if (el) { el.classList.remove('hidden'); el.classList.add('active'); }
}
function hideAllScreens() {
    document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.classList.remove('active'); });
    if (G.currentDialogueAudio) { G.currentDialogueAudio.pause(); G.currentDialogueAudio = null; }
}

// ===== DIALOGUE =====
function startDialogue(key, cb) {
    G.dialogueQueue = DIALOGUES[key] || []; G.dialogueIdx = 0; G.dialogueCb = cb;
    if (G.dialogueQueue.length === 0) { if (cb) cb(); return; }
    showScreen('dialogue-screen'); showDialogueLine();
}
function showDialogueLine() {
    const d = G.dialogueQueue[G.dialogueIdx]; if (!d) { hideAllScreens(); if (G.dialogueCb) G.dialogueCb(); return; }

    // Stop previous audio if any
    if (G.currentDialogueAudio) { G.currentDialogueAudio.pause(); G.currentDialogueAudio = null; }

    // Setup UI first
    const charLeft = document.getElementById('char-left');
    const charRight = document.getElementById('char-right');
    const isYasmine = d.speaker === 'ياسمين';
    charLeft.style.opacity = isYasmine ? '1' : '0.4';
    charLeft.style.transform = isYasmine ? 'scale(1.1)' : 'scale(0.9)';
    charLeft.style.filter = isYasmine ? 'drop-shadow(0 0 12px #d4af37)' : 'grayscale(0.5)';
    charRight.style.opacity = !isYasmine ? '1' : '0.4';
    charRight.style.transform = !isYasmine ? 'scale(1.1)' : 'scale(0.9)';
    charRight.style.filter = !isYasmine ? 'drop-shadow(0 0 12px #d4af37)' : 'grayscale(0.5)';
    document.getElementById('dialogue-speaker').textContent = d.speaker;

    // Text setup
    G.typedText = ''; G.typing = true;
    const target = d.text;
    const el = document.getElementById('dialogue-text'); el.textContent = '';
    clearInterval(G.typeInterval);

    // Dynamic Typing Function
    const startTyping = (speed) => {
        clearInterval(G.typeInterval);
        let i = 0;
        G.typeInterval = setInterval(() => {
            if (i < target.length) { G.typedText += target[i]; el.textContent = G.typedText; i++; }
            else { G.typing = false; clearInterval(G.typeInterval); }
        }, speed);
    };

    // Audio Playback & Sync
    if (d.audio) {
        G.currentDialogueAudio = new Audio(d.audio);
        G.currentDialogueAudio.addEventListener('loadedmetadata', () => {
            const duration = G.currentDialogueAudio.duration * 1000; // ms
            let speed = 30;
            if (duration > 0 && target.length > 0) {
                speed = duration / target.length;
            }
            startTyping(speed);
            G.currentDialogueAudio.play().catch(e => console.log('Audio play failed:', e));
        });
        // Fallback: If metadata doesn't load quickly, just start typing
        G.currentDialogueAudio.addEventListener('error', () => { startTyping(30); });
    } else {
        startTyping(30); // Default speed if no audio
    }
}
document.getElementById('dialogue-next').addEventListener('click', () => {
    if (G.typing) { clearInterval(G.typeInterval); document.getElementById('dialogue-text').textContent = G.dialogueQueue[G.dialogueIdx].text; G.typing = false; return; }
    G.dialogueIdx++;
    if (G.dialogueIdx >= G.dialogueQueue.length) { hideAllScreens(); if (G.dialogueCb) G.dialogueCb(); }
    else showDialogueLine();
});

// ===== SPAWN PILLAR =====
function spawnPillar(xPos) {
    const gapSize = 200;
    const margin = 80;
    const gapY = rand(margin + gapSize / 2, H - margin - gapSize / 2);
    G.pillars.push({ x: xPos, gapY, width: 80, gapSize });
}

// ===== INIT STAGES =====
function initStage(n) {
    G.stage = n; G.over = false; G.time = 0; G.spawnTimer = 0;
    G.pillars = []; G.shields = []; G.fireballs = []; G.magicBalls = [];
    G.isDragging = false; G.dragTarget = null; G.shakeTime = 0;
    resize();
    document.getElementById('hud').classList.remove('hidden');
    document.getElementById('health-bar-container').classList.add('hidden');
    document.getElementById('hit-counter').classList.add('hidden');

    if (n === 1) {
        G.pillarsPassed = 0; G.vOffset = 0;
        G.carpetBaseY = H / 2; G.carpetX = 180;
        G.input.up = false; G.input.down = false;
        spawnPillar(W + 200);
        document.getElementById('stage-label').textContent = 'المرحلة ١ – سماء بغداد';
    } else if (n === 2) {
        G.health = 100; G.levelTime = 30;
        G.carpetY = 130; G.carpetX = W / 2;
        G.shields = [
            { id: 1, x: W * 0.25, y: H * 0.65, radius: 55, isActive: true, respawnTimer: 0, isDragging: false },
            { id: 2, x: W * 0.5, y: H * 0.65, radius: 55, isActive: true, respawnTimer: 0, isDragging: false },
            { id: 3, x: W * 0.75, y: H * 0.65, radius: 55, isActive: true, respawnTimer: 0, isDragging: false }
        ];
        document.getElementById('health-bar-container').classList.remove('hidden');
        document.getElementById('stage-label').textContent = 'المرحلة ٢ – قصر الغيوم';
    } else if (n === 3) {
        G.boss = { x: W / 2, y: 140, health: 100, maxHealth: 100, pulse: 0 };
        G.mirror = { x: W / 2, y: H * 0.75, radius: 65, isDragging: false };
        G.carpetX = W / 2; G.carpetY = H * 0.85;
        document.getElementById('hit-counter').classList.remove('hidden');
        document.getElementById('stage-label').textContent = 'المرحلة ٣ – مواجهة الظل';
    }
    initStars(); G.playing = true; G.lastTime = performance.now();
    hideAllScreens(); updateHUD();
}

// ===== UPDATE STAGES =====
function updateStage1(dt) {
    const speed = 200 + G.pillarsPassed * 10;
    // Arrow keys move all pillars vertically
    const moveAmt = 280 * dt;
    if (G.input.down) G.vOffset += moveAmt;
    if (G.input.up) G.vOffset -= moveAmt;
    // Carpet auto-drifts gently
    G.carpetY = G.carpetBaseY + Math.sin(G.time * 1.8) * 100;
    // Spawn
    G.spawnTimer += dt;
    const interval = Math.max(1.4, 2.4 - G.pillarsPassed * 0.07);
    if (G.spawnTimer > interval) {
        G.spawnTimer = 0;
        spawnPillar(W + 150);
    }
    // Update pillars
    for (let idx = G.pillars.length - 1; idx >= 0; idx--) {
        const p = G.pillars[idx];
        p.x -= speed * dt;
        // Collision with vOffset
        const gy = p.gapY + G.vOffset;
        const topH = gy - p.gapSize / 2 + 8;
        const botY = gy + p.gapSize / 2 - 8;
        const s = 14;
        if (G.carpetX + s > p.x && G.carpetX - s < p.x + p.width) {
            if (G.carpetY - s < topH || G.carpetY + s > botY) doGameOver();
        }
        // Passed
        if (p.x + p.width < 0) {
            G.pillars.splice(idx, 1);
            G.pillarsPassed++; G.score += 10;
            Sound.tone(400, 'sine', 0.1, 0.04);
            updateHUD();
            if (G.pillarsPassed >= 12) stageComplete();
        }
    }
    document.getElementById('progress-bar').style.width = clamp(G.pillarsPassed / 12 * 100, 0, 100) + '%';
}

function drawStage1() {
    // Parallax clouds
    for (let i = 0; i < 5; i++) {
        const cx = ((G.time * 12 + i * 280) % (W + 200)) - 100;
        ctx.fillStyle = `rgba(100,70,150,${0.06 + i * 0.02})`;
        ctx.beginPath(); ctx.ellipse(cx, 70 + i * 55, 90, 28, 0, 0, Math.PI * 2); ctx.fill();
    }
    G.pillars.forEach(p => drawPillar(p, G.vOffset));
    drawCarpet(G.carpetX, G.carpetY);
    // Magic dust trail
    ctx.fillStyle = 'rgba(255,215,0,0.3)';
    for (let i = 0; i < 8; i++) {
        const tx = G.carpetX - 30 - i * 12;
        const ty = G.carpetY + 10 + Math.sin(G.time * 4 + i) * 8;
        ctx.beginPath(); ctx.arc(tx, ty, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
    }
}

function updateStage2(dt) {
    G.levelTime -= dt;
    G.carpetX = W / 2 + Math.sin(G.time * 0.9) * (W * 0.28);
    // Respawn shields
    G.shields.forEach(s => { if (!s.isActive) { s.respawnTimer -= dt; if (s.respawnTimer <= 0) s.isActive = true; } });
    // Spawn fireballs from bottom
    if (Math.random() < 0.045 + G.time * 0.001) {
        G.fireballs.push({ x: rand(50, W - 50), y: H + 25, speed: 250 + rand(0, 180), radius: 13, alive: true });
    }
    // Update fireballs
    for (let i = G.fireballs.length - 1; i >= 0; i--) {
        const f = G.fireballs[i];
        f.y -= f.speed * dt;
        if (f.y < -40) { G.fireballs.splice(i, 1); continue; }
        // Hit shield?
        let blocked = false;
        G.shields.forEach(s => {
            if (s.isActive && dist2(f.x, f.y, s.x, s.y) < s.radius + f.radius) {
                s.isActive = false; s.respawnTimer = 1.5;
                blocked = true; G.score += 3; Sound.hit(); updateHUD();
            }
        });
        if (blocked) { G.fireballs.splice(i, 1); continue; }
        // Hit carpet?
        if (dist2(f.x, f.y, G.carpetX, G.carpetY) < 40) {
            G.fireballs.splice(i, 1); G.health -= 12; G.shakeTime = 0.25; Sound.crash(); updateHUD();
        }
    }
    document.getElementById('health-bar').style.width = clamp(G.health, 0, 100) + '%';
    document.getElementById('progress-bar').style.width = clamp((30 - G.levelTime) / 30 * 100, 0, 100) + '%';
    if (G.health <= 0) doGameOver();
    if (G.levelTime <= 0) stageComplete();
}

function drawStage2() {
    // Palace domes
    ctx.fillStyle = 'rgba(44,14,58,0.3)';
    for (let i = 0; i < 7; i++) {
        const cx = (i + 0.5) * W / 7, cy = H - 40;
        ctx.beginPath(); ctx.moveTo(cx - 30, cy); ctx.quadraticCurveTo(cx, cy - 70 - Math.sin(G.time + i) * 8, cx + 30, cy); ctx.fill();
    }
    // Shields
    G.shields.forEach(s => drawCloud(s));
    // Fireballs
    G.fireballs.forEach(f => {
        ctx.save(); ctx.shadowBlur = 14; ctx.shadowColor = 'orange';
        const grd = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, f.radius);
        grd.addColorStop(0, '#fff4'); grd.addColorStop(0.3, '#f39c12'); grd.addColorStop(0.7, '#e74c3c'); grd.addColorStop(1, 'transparent');
        ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(f.x, f.y, f.radius, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
    // Carpet
    drawCarpet(G.carpetX, G.carpetY);
    // Timer
    ctx.fillStyle = '#d4af37'; ctx.font = '28px "Noto Kufi Arabic"'; ctx.textAlign = 'center';
    ctx.fillText(`⏳ ${Math.max(0, Math.ceil(G.levelTime))}`, W / 2, H - 20);
}

function updateStage3(dt) {
    const b = G.boss;
    b.pulse += dt * 3;
    b.x = W / 2 + Math.sin(G.time * 0.6) * (W * 0.3);
    G.carpetX = W / 2 + Math.sin(G.time * 0.4) * (W * 0.2);
    // Boss shoots purple magic
    if (Math.random() < 0.05 + G.time * 0.002) {
        G.magicBalls.push({ x: b.x, y: b.y + 60, speed: 300 + rand(0, 120), radius: 14, reflected: false, alive: true });
    }
    // Update magic balls
    for (let i = G.magicBalls.length - 1; i >= 0; i--) {
        const m = G.magicBalls[i];
        if (m.reflected) {
            m.y -= m.speed * 1.6 * dt;
            // Hit boss?
            if (dist2(m.x, m.y, b.x, b.y) < 55) {
                b.health -= 9; G.score += 15;
                Sound.hit(); G.shakeTime = 0.15;
                G.magicBalls.splice(i, 1); updateHUD(); continue;
            }
            if (m.y < -50) { G.magicBalls.splice(i, 1); continue; }
        } else {
            m.y += m.speed * dt;
            // Hit mirror?
            const mr = G.mirror;
            if (m.x > mr.x - mr.radius && m.x < mr.x + mr.radius && m.y > mr.y - mr.radius / 2 && m.y < mr.y + mr.radius / 2) {
                m.reflected = true; Sound.reflect(); continue;
            }
            // Hit carpet?
            if (dist2(m.x, m.y, G.carpetX, G.carpetY) < 45) {
                G.magicBalls.splice(i, 1); G.health -= 15; G.shakeTime = 0.2; Sound.crash(); updateHUD();
                if (G.health <= 0) doGameOver(); continue;
            }
            if (m.y > H + 50) { G.magicBalls.splice(i, 1); continue; }
        }
    }
    document.getElementById('hit-value').textContent = `${100 - b.health} / 100`;
    document.getElementById('progress-bar').style.width = clamp((100 - b.health) / 100 * 100, 0, 100) + '%';
    if (b.health <= 0) stageComplete();
}

function drawStage3() {
    // Background: Royal Purple Gradient (Lighter center for boss contrast)
    const grd = ctx.createRadialGradient(W / 2, H / 2 - 50, 50, W / 2, H / 2, H * 0.8);
    grd.addColorStop(0, '#5b2c6f');   // Lighter purple center
    grd.addColorStop(0.6, '#2c0e3a'); // Darker purple mid
    grd.addColorStop(1, '#0b0d17');    // Dark edge
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // Golden grid
    ctx.strokeStyle = 'rgba(212,175,55,0.08)'; ctx.lineWidth = 1;
    for (let i = 0; i < W; i += 60) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke(); }
    for (let i = 0; i < H; i += 60) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke(); }

    // Boss
    drawBoss(G.boss);
    // Mirror
    drawMirror(G.mirror);
    // Magic balls
    G.magicBalls.forEach(m => {
        ctx.save();
        ctx.translate(m.x, m.y);

        // Glow effect
        ctx.shadowBlur = 20;
        ctx.shadowColor = m.reflected ? '#d4af37' : '#8e44ad';

        if (xLoaded) {
            const size = m.radius * 2.5;
            ctx.drawImage(xImg, -size / 2, -size / 2, size, size);
        } else {
            ctx.fillStyle = m.reflected ? '#d4af37' : '#8e44ad';
            ctx.beginPath(); ctx.arc(0, 0, m.radius, 0, Math.PI * 2); ctx.fill();
        }

        // Trail
        ctx.globalAlpha = 0.3;
        ctx.beginPath(); ctx.arc(0, m.reflected ? 15 : -15, m.radius * 0.7, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    });
    // Carpet
    drawCarpet(G.carpetX, G.carpetY);
}

// ===== GAME FLOW =====
function stageComplete() {
    G.playing = false; Sound.stageWin();
    if (G.stage === 3) {
        startDialogue('victory', () => {
            document.getElementById('victory-score').textContent = G.score;
            showScreen('victory-screen'); Sound.victory();
        });
    } else {
        const msgs = ['اجتزت سماء بغداد', 'صددت هجمات الجن'];
        document.getElementById('stage-complete-msg').textContent = msgs[G.stage - 1];
        showScreen('stage-complete-screen');
    }
}
function doGameOver() {
    G.playing = false; G.over = true; Sound.crash();
    const names = ['', 'سماء بغداد', 'قصر الغيوم', 'مواجهة الظل'];
    document.getElementById('final-score').textContent = G.score;
    document.getElementById('game-over-stage').textContent = 'في مرحلة: ' + names[G.stage];
    showScreen('game-over-screen');
}
function updateHUD() { document.getElementById('score-value').textContent = G.score; }

// ===== INPUT — Stage 1: Arrow Keys, Stage 2&3: Drag =====
// Keyboard for Stage 1
window.addEventListener('keydown', e => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') { G.input.up = true; Sound.whoosh(); }
    if (e.code === 'ArrowDown' || e.code === 'KeyS') { G.input.down = true; Sound.whoosh(); }
});
window.addEventListener('keyup', e => {
    if (e.code === 'ArrowUp' || e.code === 'KeyW') G.input.up = false;
    if (e.code === 'ArrowDown' || e.code === 'KeyS') G.input.down = false;
});

// Mouse/Touch for all stages
function getXY(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
}

function handleDown(e) {
    e.preventDefault();
    const { x, y } = getXY(e);
    if (G.stage === 1) {
        // Touch top/bottom of screen for Stage 1
        if (y < H / 2) { G.input.down = true; } else { G.input.up = true; }
        Sound.whoosh();
    } else if (G.stage === 2) {
        G.isDragging = true;
        G.dragTarget = G.shields.find(s => s.isActive && dist2(x, y, s.x, s.y) < s.radius * 1.5);
        if (G.dragTarget) G.dragTarget.isDragging = true;
    } else if (G.stage === 3) {
        G.isDragging = true;
        if (dist2(x, y, G.mirror.x, G.mirror.y) < G.mirror.radius * 1.8) {
            G.dragTarget = G.mirror; G.mirror.isDragging = true;
        }
    }
}

function handleMove(e) {
    e.preventDefault();
    const { x, y } = getXY(e);
    if (G.stage === 2 && G.isDragging && G.dragTarget) {
        G.dragTarget.x = clamp(x, 30, W - 30);
        G.dragTarget.y = clamp(y, 30, H - 30);
    } else if (G.stage === 3 && G.isDragging && G.dragTarget) {
        G.dragTarget.x = clamp(x, G.dragTarget.radius, W - G.dragTarget.radius);
        G.dragTarget.y = clamp(y, H * 0.4, H - 30);
    }
}

function handleUp() {
    // Stage 1 touch release
    G.input.up = false; G.input.down = false;
    // Stage 2&3 drag release
    if (G.dragTarget) G.dragTarget.isDragging = false;
    G.isDragging = false; G.dragTarget = null;
}

canvas.addEventListener('mousedown', handleDown);
canvas.addEventListener('mousemove', handleMove);
canvas.addEventListener('mouseup', handleUp);
canvas.addEventListener('touchstart', handleDown, { passive: false });
canvas.addEventListener('touchmove', handleMove, { passive: false });
canvas.addEventListener('touchend', handleUp);

// ===== MAIN LOOP =====
function mainLoop(ts) {
    if (!G.lastTime) G.lastTime = ts;
    let dt = (ts - G.lastTime) / 1000;
    G.lastTime = ts;
    if (dt > 0.1) dt = 0.016;

    ctx.save();
    if (G.shakeTime > 0) { G.shakeTime -= dt; ctx.translate(rand(-5, 5), rand(-5, 5)); }
    ctx.clearRect(0, 0, W, H);
    updateStars(dt); drawStars();

    if (G.playing) {
        G.time += dt;
        if (G.stage === 1) { updateStage1(dt); drawStage1(); }
        else if (G.stage === 2) { updateStage2(dt); drawStage2(); }
        else if (G.stage === 3) { updateStage3(dt); drawStage3(); }
    }
    ctx.restore();
    requestAnimationFrame(mainLoop);
}

// ===== BUTTONS =====
document.getElementById('start-btn').addEventListener('click', () => {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    G.score = 0;
    startDialogue('stage1', () => initStage(1));
});
document.getElementById('info-btn').addEventListener('click', () => {
    showScreen('instructions-screen');
});
document.getElementById('back-btn').addEventListener('click', () => {
    showScreen('start-screen');
});
document.getElementById('next-stage-btn').addEventListener('click', () => {
    hideAllScreens();
    const next = G.stage + 1;
    startDialogue('stage' + next, () => initStage(next));
});
document.getElementById('restart-btn').addEventListener('click', () => { G.score = 0; startDialogue('stage1', () => initStage(1)); });
document.getElementById('replay-btn').addEventListener('click', () => { G.score = 0; startDialogue('stage1', () => initStage(1)); });



// ===== START =====
initStars();
requestAnimationFrame(mainLoop);

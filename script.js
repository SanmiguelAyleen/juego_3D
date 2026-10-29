let score = 0;
let shots = 0;
let hits = 0;
let health = 100;

const maxHealth = 100;

let defeated = false;
let targetX = 50;
let targetY = 50;
let lastMove = 0;
let nextMove = 0;
let lastShot = 0;
let startTime = performance.now();
let animationFrame;

const viewerBox = document.getElementById("viewerBox");
const targetOverlay = document.getElementById("targetOverlay");
const eyeModel = document.getElementById("eyeModel");

const scoreEl = document.getElementById("score");
const shotsEl = document.getElementById("shots");
const hitsEl = document.getElementById("hits");
const accuracyEl = document.getElementById("accuracy");
const healthBar = document.getElementById("health-bar");
const healthText = document.getElementById("health-text");
const warning = document.getElementById("warning");
const gameStatus = document.getElementById("gameStatus");
const screenMessage = document.getElementById("screenMessage");

const random = (min, max) => Math.random() * (max - min) + min;

function updateUI() {
    scoreEl.textContent = score;
    shotsEl.textContent = shots;
    hitsEl.textContent = hits;

    accuracyEl.textContent = shots
        ? Math.round(hits / shots * 100) + "%"
        : "0%";

    healthBar.style.width = health + "%";
    healthText.textContent = health + " / " + maxHealth;

    viewerBox.classList.toggle("critical", health <= 30);
    viewerBox.classList.toggle("terror-mode", health <= 60);

    if (health <= 30 && health > 0) {
        warning.textContent = "● ALERTA ROJA // SUJETO FURIOSO";
    } else if (health <= 60 && health > 30) {
        warning.textContent = "● ADVERTENCIA // SUJETO INESTABLE";
    } else if (health > 60) {
        warning.textContent = "● SUJETO ACTIVO";
    }
}

// Cambia la posición del ojo en el escenario.
function moveEye(force = false) {
    if (defeated) return;

    const now = performance.now();

    if (!force && now - lastMove < 90) return;

    lastMove = now;

    const intensity = 1 - health / maxHealth;

    // Cuando está herido, puede aparecer en casi
    // cualquier parte del área de juego.
    const marginX = health <= 30 ? 13 : 23;
    const marginY = health <= 30 ? 18 : 28;

    targetX = random(marginX, 100 - marginX);
    targetY = random(marginY, 100 - marginY);

    eyeModel.style.transitionDuration =
        Math.max(0.055, 0.24 - intensity * 0.17) + "s";

    eyeModel.style.left = targetX + "%";
    eyeModel.style.top = targetY + "%";

    // Cambia el tamaño ligeramente para simular
    // que el ojo se acerca y se aleja.
    const scale = random(0.86, 1.12 + intensity * 0.15);
    eyeModel.style.width = (58 * scale) + "%";
    eyeModel.style.height = (82 * scale) + "%";
}

// Animación continua: giro 3D y movimiento orgánico.
function animate(now) {
    if (defeated) return;

    const elapsed = (now - startTime) / 1000;
    const intensity = 1 - health / maxHealth;

    const speed = 0.45 + intensity * 2.7;

    // Ángulos de cámara: permite observar el modelo
    // desde diferentes lados y elevaciones.
    const yaw = Math.sin(elapsed * speed) * 65
        + Math.sin(elapsed * speed * 1.7) * 18;

    const pitch = 70
        + Math.sin(elapsed * speed * 0.8) * 17;

    const distance = 2.5
        + Math.sin(elapsed * speed * 0.6) * 0.25;

    eyeModel.cameraOrbit =
        `${yaw}deg ${pitch}deg ${distance}m`;

    // Inclinación adicional del objeto.
    const tilt = Math.sin(elapsed * speed * 1.3)
        * (4 + intensity * 13);

    const roll = Math.cos(elapsed * speed * 0.9)
        * (3 + intensity * 10);

    eyeModel.style.transform =
        `translate(-50%, -50%) rotate(${tilt}deg) rotate(${roll}deg)`;

    // Esquivas automáticas más frecuentes al perder vida.
    const interval = health <= 20 ? 120
        : health <= 40 ? 210
        : health <= 60 ? 500
        : 1300;

    if (now >= nextMove) {
        moveEye(true);
        nextMove = now + random(interval * 0.65, interval * 1.4);
    }

    // Vibración visual progresiva.
    viewerBox.style.setProperty(
        "--terror-intensity",
        intensity
    );

    animationFrame = requestAnimationFrame(animate);
}

function playShotSound(hit) {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = hit ? "sawtooth" : "triangle";
        osc.frequency.setValueAtTime(
            hit ? 110 : 450, ctx.currentTime
        );

        osc.frequency.exponentialRampToValueAtTime(
            hit ? 40 : 150, ctx.currentTime + 0.12
        );

        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.001, ctx.currentTime + 0.13
        );

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.14);
        osc.onended = () => ctx.close();
    } catch (error) {
        // El juego funciona aunque el audio no esté disponible.
    }
}

function showImpact(x, y, critical) {
    const mark = document.createElement("div");
    mark.className = "impact-mark";
    mark.style.left = x + "px";
    mark.style.top = y + "px";
    viewerBox.appendChild(mark);

    const text = document.createElement("div");
    text.className = "damage-text";
    text.textContent = critical ? "¡CRÍTICO! -25" : "-10";
    text.style.left = x + "px";
    text.style.top = (y - 15) + "px";
    viewerBox.appendChild(text);

    setTimeout(() => mark.remove(), 400);
    setTimeout(() => text.remove(), 700);
}

function finishGame() {
    defeated = true;

    cancelAnimationFrame(animationFrame);

    score += 500;
    updateUI();

    warning.textContent = "● SUJETO NEUTRALIZADO";
    gameStatus.textContent = "EXPERIMENTO FINALIZADO";

    viewerBox.classList.remove("terror-mode");
    screenMessage.classList.add("show");
}

// El botón derecho ya no controla al ojo.
targetOverlay.addEventListener("contextmenu", event => {
    event.preventDefault();
});

// Solo el clic izquierdo dispara.
targetOverlay.addEventListener("pointerdown", event => {
    if (event.button !== 0 || defeated) return;

    event.preventDefault();

    // Evita disparos excesivamente rápidos.
    const now = performance.now();
    if (now - lastShot < 80) return;
    lastShot = now;

    shots++;

    const rect = viewerBox.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const eyeRect = eyeModel.getBoundingClientRect();

    // Centro visual del modelo en movimiento.
    const cx = eyeRect.left + eyeRect.width / 2 - rect.left;
    const cy = eyeRect.top + eyeRect.height / 2 - rect.top;

    // Zona aproximada del ojo, más pequeña cuando
    // el enemigo está herido.
    const difficulty = health <= 20 ? 0.58
        : health <= 40 ? 0.70
        : health <= 60 ? 0.84
        : 1;

    const radiusX = eyeRect.width * 0.34 * difficulty;
    const radiusY = eyeRect.height * 0.34 * difficulty;

    const dx = (x - cx) / Math.max(radiusX, 1);
    const dy = (y - cy) / Math.max(radiusY, 1);

    const distance = Math.hypot(dx, dy);
    const hit = distance <= 1;

    playShotSound(hit);

    if (hit) {
        hits++;

        const critical = distance < 0.25;
        const damage = critical ? 25 : 10;
        const points = critical ? 200 : 100;

        health = Math.max(0, health - damage);
        score += points;

        showImpact(x, y, critical);

        viewerBox.classList.remove("damaged");
        void viewerBox.offsetWidth;
        viewerBox.classList.add("damaged");

        if (health <= 0) {
            finishGame();
        } else {
            // Cada impacto hace que el ojo escape.
            moveEye(true);
            nextMove = performance.now() + 80;
        }
    } else {
        gameStatus.textContent =
            health <= 30
                ? "¡FALLO! EL SUJETO SE RETUERCE EN LA OSCURIDAD"
                : "FALLO... EL OJO SIGUE OBSERVÁNDOTE";

        // Al fallar, el enemigo aprovecha para esquivar.
        moveEye(true);
        nextMove = performance.now() + 80;
    }

    updateUI();
});

function resetGame() {
    cancelAnimationFrame(animationFrame);

    score = 0;
    shots = 0;
    hits = 0;
    health = maxHealth;

    defeated = false;
    targetX = 50;
    targetY = 50;
    lastMove = 0;
    nextMove = 0;
    lastShot = 0;
    startTime = performance.now();

    eyeModel.style.transitionDuration = "0.2s";
    eyeModel.style.left = "50%";
    eyeModel.style.top = "50%";
    eyeModel.style.width = "58%";
    eyeModel.style.height = "82%";
    eyeModel.style.transform = "translate(-50%, -50%)";

    eyeModel.cameraOrbit = "0deg 75deg 2.5m";

    viewerBox.classList.remove(
        "critical", "terror-mode", "damaged"
    );

    screenMessage.classList.remove("show");

    warning.textContent = "● SUJETO ACTIVO";
    gameStatus.textContent = "EL SUJETO TE ESTÁ OBSERVANDO";

    updateUI();
    animationFrame = requestAnimationFrame(animate);
}

document.getElementById("resetButton")
    .addEventListener("click", resetGame);

document.getElementById("nextRound")
    .addEventListener("click", resetGame);

eyeModel.addEventListener("error", () => {
    gameStatus.textContent =
        "ERROR: NO SE PUDO CARGAR object/monster_eye.glb";
});

eyeModel.addEventListener("load", () => {
    gameStatus.textContent =
        "SUJETO DETECTADO // BUENA SUERTE";
});

updateUI();
animationFrame = requestAnimationFrame(animate);

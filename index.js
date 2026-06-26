const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu");
const gameScreen = document.getElementById("gameScreen");

const startBtn = document.getElementById("startBtn");
const homeBtn = document.getElementById("homeBtn");
const restartBtn = document.getElementById("restartBtn");
const skinButtons = document.querySelectorAll(".skin-btn");

const menuHighScore = document.getElementById("menuHighScore");
const menuMaxTime = document.getElementById("menuMaxTime");
const scoreElement = document.getElementById("score");
const timerElement = document.getElementById("timer");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let food = { x: 5, y: 5 };
let bonusFood = { x: -1, y: -1, active: false, timer: 0 };
let obstacles = [];

// ЭФФЕКТТЕР ҮЧҮН МАССИВДЕР
let particles = [];
let trailParticles = [];

// КОМБО СИСТЕМА СЫ
let comboCount = 0;
let comboTimer = 0;
let comboText = { text: "", opacity: 0, x: 0, y: 0 };

let dx = 1; let dy = 0;
let score = 0;
let gameSeconds = 0;

let highScore = localStorage.getItem("cartoonSnakeHighScore") || 0;
let maxTime = localStorage.getItem("cartoonSnakeMaxTime") || 0;
let snakeColor = "#FF5722"; 

let gameInterval;
let clockInterval;
let gameOver = false;

const colorMap = {
    "#FF5722": { light: "#ff8a50", dark: "#e64a19" },
    "#4CAF50": { light: "#81c784", dark: "#388E3C" },
    "#FFEB3B": { light: "#fff176", dark: "#FBC02D" },
    "#00BCD4": { light: "#4dd0e1", dark: "#0097A7" }
};

function updateMenuStats() {
    menuHighScore.textContent = highScore;
    menuMaxTime.textContent = maxTime;
}
updateMenuStats();

skinButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
        skinButtons.forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        snakeColor = e.target.getAttribute("data-color");
    });
});

startBtn.addEventListener("click", () => {
    mainMenu.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    initGame();
});

homeBtn.addEventListener("click", () => {
    clearInterval(gameInterval);
    clearInterval(clockInterval);
    gameScreen.classList.add("hidden");
    mainMenu.classList.remove("hidden");
    updateMenuStats();
});

restartBtn.addEventListener("click", initGame);

function initGame() {
    clearInterval(gameInterval);
    clearInterval(clockInterval);
    
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    obstacles = [];
    particles = [];
    trailParticles = [];
    
    comboCount = 0;
    comboTimer = 0;
    comboText.opacity = 0;
    generateFood();
    bonusFood.active = false;
    dx = 1; dy = 0;
    score = 0;
    gameSeconds = 0;
    gameOver = false;
    
    scoreElement.textContent = score;
    timerElement.textContent = gameSeconds;
    restartBtn.classList.add("hidden");

    clockInterval = setInterval(() => {
        if (!gameOver) {
            gameSeconds++;
            timerElement.textContent = gameSeconds;
            if (comboTimer > 0) comboTimer--;
            if (comboTimer === 0) comboCount = 0;
        }
    }, 1000);

    gameInterval = setInterval(update, 150);
}

function update() {
    if (gameOver) return;
    
    // Куйруктун артынан из калтыруу
    let tail = snake[snake.length - 1];
    if (tail) createTrail(tail.x, tail.y);

    moveSnake();
    
    if (checkCollision()) {
        gameOver = true;
        clearInterval(gameInterval);
        clearInterval(clockInterval);
        restartBtn.classList.remove("hidden");
        drawGameOver();
        return;
    }

    checkFoodEat();
    updateParticles();
    updateTrail();
    
    clearCanvas();
    drawObstacles();
    drawFood();
    drawBonusFood();
    drawTrail(); 
    drawParticles(); 
    drawSnake(); 
    drawComboText(); 
}

// Таза жана заманбап торчо фон
function clearCanvas() {
    ctx.fillStyle = "#edf2f7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = "#e2e8f0";
    for (let r = 0; r < tileCount; r++) {
        for (let c = 0; c < tileCount; c++) {
            if ((r + c) % 2 === 0) {
                ctx.fillRect(c * gridSize, r * gridSize, gridSize, gridSize);
            }
        }
    }
}

// Сыйкырдуу куйрук издерин жаратуу
function createTrail(x, y) {
    let px = x * gridSize + gridSize / 2;
    let py = y * gridSize + gridSize / 2;
    trailParticles.push({
        x: px + (Math.random() - 0.5) * 6,
        y: py + (Math.random() - 0.5) * 6,
        alpha: 0.8,
        size: Math.random() * 3 + 2
    });
}

function updateTrail() {
    for (let i = trailParticles.length - 1; i >= 0; i--) {
        let t = trailParticles[i];
        t.alpha -= 0.08;
        if (t.alpha <= 0) trailParticles.splice(i, 1);
    }
}

function drawTrail() {
    trailParticles.forEach(t => {
        ctx.save();
        ctx.globalAlpha = t.alpha;
        ctx.fillStyle = snakeColor;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

function generateObstacles() {
    obstacles = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 14, y: 13 }, { x: 14, y: 14 }];
}

function drawObstacles() {
    if (score >= 30) {
        if (obstacles.length === 0) generateObstacles();
        obstacles.forEach(obs => {
            let cx = obs.x * gridSize + gridSize / 2;
            let cy = obs.y * gridSize + gridSize / 2;
            
            let grad = ctx.createRadialGradient(cx - 3, cy - 3, 2, cx, cy, gridSize / 2);
            grad.addColorStop(0, "#a0aec0");
            grad.addColorStop(1, "#4a5568");
            
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, gridSize / 2 - 1, 0, Math.PI * 2);
            ctx.fill();
        });
    }
}

function drawSnake() {
    const colors = colorMap[snakeColor] || { light: "#fff", dark: "#000" };

    snake.forEach((part, index) => {
        let cx = part.x * gridSize + gridSize / 2;
        let cy = part.y * gridSize + gridSize / 2;

        let grad = ctx.createRadialGradient(cx - 4, cy - 4, 1, cx, cy, gridSize / 2);
        grad.addColorStop(0, colors.light);
        grad.addColorStop(0.8, snakeColor);
        grad.addColorStop(1, colors.dark);

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, gridSize / 2 - 1, 0, Math.PI * 2);
        ctx.fill();

        // КӨЗДӨРДҮН БАГЫТЫН КЫЙМЫЛГА КАРАП БУРУУ
        if (index === 0) {
            ctx.fillStyle = "#FFF";
            let eyeX1, eyeY1, eyeX2, eyeY2;

            if (dx === 1) { 
                eyeX1 = 12; eyeY1 = 5; eyeX2 = 12; eyeY2 = 15;
            } else if (dx === -1) { 
                eyeX1 = 8; eyeY1 = 5; eyeX2 = 8; eyeY2 = 15;
            } else if (dy === 1) { 
                eyeX1 = 5; eyeY1 = 12; eyeX2 = 15; eyeY2 = 12;
            } else { 
                eyeX1 = 5; eyeY1 = 8; eyeX2 = 15; eyeY2 = 8;
            }

            ctx.beginPath();
            ctx.arc(part.x * gridSize + eyeX1, part.y * gridSize + eyeY1, 3, 0, Math.PI * 2);
            ctx.arc(part.x * gridSize + eyeX2, part.y * gridSize + eyeY2, 3, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.fillStyle = "#000";
            ctx.beginPath();
            ctx.arc(part.x * gridSize + eyeX1 + dx*0.5, part.y * gridSize + eyeY1 + dy*0.5, 1.5, 0, Math.PI * 2);
            ctx.arc(part.x * gridSize + eyeX2 + dx*0.5, part.y * gridSize + eyeY2 + dy*0.5, 1.5, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

// АЛМА ЖЕГЕНДЕ ЧАЧЫРОО ЭФФЕКТИ
function createBurst(x, y, color) {
    let px = x * gridSize + gridSize / 2;
    let py = y * gridSize + gridSize / 2;
    for (let i = 0; i < 12; i++) {
        particles.push({
            x: px,
            y: py,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: Math.random() * 3 + 2,
            alpha: 1,
            color: color
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= 0.05;
        if (p.alpha <= 0) particles.splice(i, 1);
    }
}

function drawParticles() {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    });
}

// КОМБО ЖАЗУУСУ
function drawComboText() {
    if (comboText.opacity > 0) {
        ctx.save();
        ctx.globalAlpha = comboText.opacity;
        ctx.fillStyle = "#e67e22";
        ctx.font = "bold 20px 'Montserrat'";
        ctx.textAlign = "center";
        ctx.fillText(comboText.text, comboText.x, comboText.y);
        comboText.y -= 0.5;
        comboText.opacity -= 0.02;
        ctx.restore();
    }
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);
    snake.pop();
}

function drawFood() {
    let cx = food.x * gridSize + gridSize / 2;
    let cy = food.y * gridSize + gridSize / 2;
    let grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, gridSize / 2);
    grad.addColorStop(0, "#ff7675");
    grad.addColorStop(1, "#d63031");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, gridSize / 2 - 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawBonusFood() {
    if (bonusFood.active) {
        bonusFood.timer--;
        if (bonusFood.timer <= 0) { bonusFood.active = false; return; }
        let cx = bonusFood.x * gridSize + gridSize / 2;
        let cy = bonusFood.y * gridSize + gridSize / 2;
        let grad = ctx.createRadialGradient(cx - 3, cy - 3, 1, cx, cy, gridSize / 2);
        grad.addColorStop(0, "#fff9db");
        grad.addColorStop(1, "#fcc419");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, gridSize / 2 - 1, 0, Math.PI * 2);
        ctx.fill();
    }
}

function generateFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    if (snake.some(p => p.x === food.x && p.y === food.y)) generateFood();
}

function checkFoodEat() {
    if (snake[0].x === food.x && snake[0].y === food.y) {
        comboCount++;
        comboTimer = 4;
        let addedScore = 10;
        
        if (comboCount >= 3) {
            addedScore = 20;
            comboText = { 
                text: `COMBO x${comboCount}! 🔥`, 
                opacity: 1, 
                x: food.x * gridSize + gridSize, 
                y: food.y * gridSize - 10 
            };
        }

        score += addedScore;
        createBurst(food.x, food.y, "#ff7675");

        snake.push({...snake[snake.length - 1]});
        generateFood();
        
        if (Math.random() < 0.3 && !bonusFood.active) {
            bonusFood.x = Math.floor(Math.random() * tileCount);
            bonusFood.y = Math.floor(Math.random() * tileCount);
            bonusFood.active = true; bonusFood.timer = 50;
        }
        saveStats();
    }

    if (bonusFood.active && snake[0].x === bonusFood.x && snake[0].y === bonusFood.y) {
        score += 30;
        createBurst(bonusFood.x, bonusFood.y, "#fcc419");
        bonusFood.active = false;
        snake.push({...snake[snake.length - 1]});
        saveStats();
    }
}

function saveStats() {
    scoreElement.textContent = score;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("cartoonSnakeHighScore", highScore);
    }
    if (gameSeconds > maxTime) {
        maxTime = gameSeconds;
        localStorage.setItem("cartoonSnakeMaxTime", maxTime);
    }
}

function checkCollision() {
    const head = snake[0];
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) return true;
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) return true;
    }
    if (score >= 30) {
        for (let i = 0; i < obstacles.length; i++) {
            if (head.x === obstacles[i].x && head.y === obstacles[i].y) return true;
        }
    }
    return false;
}

function drawGameOver() {
    if (gameSeconds > maxTime) {
        maxTime = gameSeconds;
        localStorage.setItem("cartoonSnakeMaxTime", maxTime);
    }
    ctx.fillStyle = "rgba(45, 55, 72, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#FFF";
    ctx.font = "bold 32px 'Montserrat'";
    ctx.textAlign = "center";
    ctx.fillText("ИГРА ОКОНЧЕНА!", canvas.width / 2, canvas.height / 2);
}

// КОМПЬЮТЕР ҮЧҮН (КЛАВИАТУРА)
window.addEventListener("keydown", e => {
    switch (e.key) {
        case "ArrowUp": case "w": case "W": if (dy !== 1) { dx = 0; dy = -1; } break;
        case "ArrowDown": case "s": case "S": if (dy !== -1) { dx = 0; dy = 1; } break;
        case "ArrowLeft": case "a": case "A": if (dx !== 1) { dx = -1; dy = 0; } break;
        case "ArrowRight": case "d": case "D": if (dx !== -1) { dx = 1; dy = 0; } break;
    }
});

// ТЕЛЕФОН ҮЧҮН ЭКРАНДЫ БАСУУ (TAP) АРКЫЛУУ БАШКАРУУ
canvas.addEventListener("touchstart", e => {
    if (gameOver) return;

    const rect = canvas.getBoundingClientRect();
    const touchX = e.touches[0].clientX - rect.left;
    const touchY = e.touches[0].clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const diffX = touchX - centerX;
    const diffY = touchY - centerY;

    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && dx !== -1) {
            dx = 1; dy = 0; // Оң жакты басты
        } else if (diffX < 0 && dx !== 1) {
            dx = -1; dy = 0; // Сол жакты басты
        }
    } else {
        if (diffY > 0 && dy !== -1) {
            dx = 0; dy = 1; // Төмөн жакты басты
        } else if (diffY < -30 && dy !== 1) {
            dx = 0; dy = -1; // Жогору жакты басты
        }
    }
}, { passive: true });
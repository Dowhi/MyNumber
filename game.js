/**
 * MYNUMBER (STARTER EDITION)
 * Management of Views, Ranking, Phase Refills, and Hints with Connections.
 */

const GRID_COLS = 9;
const INITIAL_TARGET_CELLS = 35;
const VISIBLE_ROWS = 12; 
const TOTAL_CELL_SCREEN = GRID_COLS * VISIBLE_ROWS;

const DARK_PALETTE = [
    '#000000', // Black
    '#007AFF', // iOS Blue
    '#5856D6', // iOS Indigo
    '#34C759', // iOS Green
    '#FF2D55', // iOS Pink/Red
    '#AF52DE'  // iOS Purple
];

const STATE = {
    ACTIVE: 'ACTIVE',
    NULL: 'NULL'
};

class MyNumberGame {
    constructor() {
        this.board = []; 
        this.selectedIndices = [];
        this.score = 0; 
        this.visualScore = 0; 
        
        // Load Scores & Stats
        this.allTimeHighScore = parseInt(localStorage.getItem('myNumberHighScore')) || 0;
        this.dailyHighScore = parseInt(localStorage.getItem('myNumberDailyHighScore')) || 0;
        this.ranking = JSON.parse(localStorage.getItem('myNumberRanking')) || [];
        this.stats = JSON.parse(localStorage.getItem('myNumberStats')) || {
            won: 0,
            lost: 0,
            matches: 0,
            linesCleared: 0,
            hintsUsed: 0,
            numbersAdded: 0,
            maxFase: 1,
            totalPoints: 0,
            achievements: []
        };
        this.playerName = localStorage.getItem('myNumberPlayerName') || 'Jugador';
        
        this.groupCount = 0;
        
        this.checkDailyReset();

        this.fase = 1;
        this.addCount = 5;
        this.hintCount = 5; 

        this.initDOM();
        
        // Load Board or Init
        if (!this.loadBoard()) {
            this.initBoard();
        }
        
        this.render();
        
        window.GAME = this;
    }

    saveBoard() {
        const boardData = {
            board: this.board,
            score: this.score,
            fase: this.fase,
            addCount: this.addCount,
            hintCount: this.hintCount,
            groupCount: this.groupCount
        };
        localStorage.setItem('myNumberBoard', JSON.stringify(boardData));
    }

    loadBoard() {
        const saved = localStorage.getItem('myNumberBoard');
        if (!saved) return false;
        try {
            const data = JSON.parse(saved);
            this.board = data.board;
            this.score = data.score;
            this.visualScore = data.score;
            this.fase = data.fase;
            this.addCount = data.addCount;
            this.hintCount = data.hintCount;
            this.groupCount = data.groupCount;
            return true;
        } catch(e) { return false; }
    }

    checkDailyReset() {
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem('myNumberLastDate');
        if (lastDate !== today) {
            this.dailyHighScore = 0;
            localStorage.setItem('myNumberDailyHighScore', 0);
            localStorage.setItem('myNumberLastDate', today);
        }
    }

    initDOM() {
        this.gridElement = document.getElementById('game-board');
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.faseElement = document.getElementById('fase');
        this.eliminatedContainer = document.querySelector('.eliminated-numbers');
        this.hintOverlay = document.getElementById('hint-overlay');
        
        this.addBtn = document.getElementById('add-btn');
        this.hintBtn = document.getElementById('hint-btn');
        this.addCountElement = document.getElementById('add-count');
        this.hintCountElement = document.getElementById('hint-count');

        this.addBtn.addEventListener('click', () => this.addNumbers());
        this.hintBtn.addEventListener('click', () => this.showHint());
        
        this.homeHS = document.getElementById('home-high-score');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.finalScoreElement = document.getElementById('final-score');

        document.getElementById('edit-name-btn').onclick = () => this.changeName();
        this.updateHeader();
        this.checkAchievements();
    }

    updateHeader() {
        document.getElementById('display-name').innerText = this.playerName;
        this.renderAchievementsMini();
    }

    changeName() {
        const newName = prompt("¿Cómo te llamas, maestro?", this.playerName);
        if (newName && newName.trim()) {
            this.playerName = newName.trim().substring(0, 12);
            localStorage.setItem('myNumberPlayerName', this.playerName);
            this.updateHeader();
            this.showToast(`¡Hola, ${this.playerName}! 👋`);
        }
    }

    updateHighScores() {
        if (this.score > this.allTimeHighScore) {
            this.allTimeHighScore = this.score;
            localStorage.setItem('myNumberHighScore', this.allTimeHighScore);
        }
        if (this.score > this.dailyHighScore) {
            this.dailyHighScore = this.score;
            localStorage.setItem('myNumberDailyHighScore', this.dailyHighScore);
        }
        if (this.homeHS) this.homeHS.innerText = this.formatScore(this.allTimeHighScore);
    }

    renderAchievementsMini() {
        const container = document.getElementById('achievements-mini');
        if (!container) return;
        const list = [
            { id: '100matches', icon: '🎯', hint: '100 Parejas' },
            { id: 'master', icon: '👑', hint: 'Fase 5' },
            { id: 'speed', icon: '⚡', hint: 'Velocidad' }
        ];
        container.innerHTML = list.map(a => `
            <div class="achievement-icon ${this.stats.achievements && this.stats.achievements.includes(a.id) ? 'active' : ''}" title="${a.hint}">
                ${a.icon}
            </div>
        `).join('');
    }



    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screenId}-screen`).classList.add('active');
        if (screenId === 'home') this.homeHS.innerText = this.formatScore(this.allTimeHighScore);
        if (screenId === 'ranking') this.renderRanking();
        if (screenId === 'stats') this.renderStats();
    }

    startNewGame() {
        const inProgress = this.board.some(c => c.state === STATE.ACTIVE);
        if (inProgress) {
            this.openModal(
                "¿Nueva Partida?", 
                "¿Seguro que quieres abandonar la partida actual y empezar una nueva?", 
                () => this.resetGame()
            );
        } else {
            this.resetGame();
        }
    }



    resetGame() {
        this.board = [];
        this.score = 0;
        this.visualScore = 0;
        this.fase = 1;
        this.addCount = 5;
        this.hintCount = 5;
        this.groupCount = 0;
        this.selectedIndices = [];
        this.gameOverOverlay.classList.remove('active');
        this.initBoard();
        this.saveBoard();
        this.switchScreen('game');
        this.render();
    }

    openModal(title, text, onConfirm) {
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('modal-title');
        const textEl = document.getElementById('modal-text');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        titleEl.innerText = title;
        textEl.innerText = text;
        modal.classList.add('active');

        const close = () => {
            modal.classList.remove('active');
            confirmBtn.onclick = null;
            cancelBtn.onclick = null;
        };

        confirmBtn.onclick = () => {
            close();
            onConfirm();
        };
        cancelBtn.onclick = close;
    }

    showBienVisto() {
        const msgs = [
            "¡Movimiento MAESTRO! 🧠⚡",
            "¡Bien visto, GENIO! 🧐🌟",
            "¡Jugada PREMIUM! 💎🔥",
            "¡Qué puntería! 🎯✨",
            "¡Estrategia IMPECABLE! 🛡️🔝"
        ];
        const randomMsg = msgs[Math.floor(Math.random() * msgs.length)];
        this.showToast(randomMsg);
    }

    initBoard() {
        this.board = [];
        const guaranteed = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const others = [];
        for (let i = 0; i < (INITIAL_TARGET_CELLS - guaranteed.length); i++) {
            others.push(Math.floor(Math.random() * 9) + 1);
        }
        const fullSet = [...guaranteed, ...others].sort(() => Math.random() - 0.5);
        fullSet.forEach(val => this.board.push({ value: val, state: STATE.ACTIVE, group: 0 }));
    }

    saveStats() {
        localStorage.setItem('myNumberStats', JSON.stringify(this.stats));
    }

    // Metodos de persistencia centralizados arriba

    // Metodos de persistencia centralizados arriba

    getMatchInfo(idx1, idx2) {
        const cell1 = this.board[idx1];
        const cell2 = this.board[idx2];
        if (!cell1 || !cell2 || cell1.state !== STATE.ACTIVE || cell2.state !== STATE.ACTIVE) return { matchable: false };

        const val1 = Number(cell1.value);
        const val2 = Number(cell2.value);
        if (val1 + val2 !== 10 && val1 !== val2) return { matchable: false };

        const start = Math.min(idx1, idx2);
        const end = Math.max(idx1, idx2);
        const row1 = Math.floor(idx1 / GRID_COLS);
        const col1 = idx1 % GRID_COLS;
        const row2 = Math.floor(idx2 / GRID_COLS);
        const col2 = idx2 % GRID_COLS;

        const isImmediateHorizontal = Math.abs(idx1 - idx2) === 1 && row1 === row2;
        const isImmediateVertical = Math.abs(row1 - row2) === 1 && col1 === col2;
        const isImmediateDiagonal = Math.abs(row1 - row2) === 1 && Math.abs(col1 - col2) === 1;

        // Sequence check (horizontal or cross-line sequence)
        let activeBetween = 0;
        let gapsDetected = false;
        for (let i = start + 1; i < end; i++) {
            if (this.board[i].state === STATE.ACTIVE) activeBetween++;
            else gapsDetected = true;
        }

        if (activeBetween === 0) {
            // Horizontal immediate (same row, adjacent)
            if (isImmediateHorizontal) return { matchable: true, points: 1, special: false };

            // Cross-line: one cell at end of a row (col GRID_COLS-1), the other at start of any row (col 0)
            const startCol = start % GRID_COLS;
            const endCol   = end   % GRID_COLS;
            const isCrossLine = (startCol === GRID_COLS - 1 && endCol === 0);

            if (isCrossLine) {
                // SPECIAL: cross-line (end of row -> start of next)
                return { matchable: true, points: 4, special: true };
            }

            // Horizontal with gaps (same row but non-adjacent)
            if (gapsDetected) return { matchable: true, points: 4, special: true };

            // Any other case with no active between (separated horizontally or vertically)
            return { matchable: true, points: 4, special: true };
        }

        // Vertical check
        if (col1 === col2) {
            let blocked = false; let gap = false;
            for (let r = Math.min(row1, row2) + 1; r < Math.max(row1, row2); r++) {
                if (this.board[r * GRID_COLS + col1].state === STATE.ACTIVE) { blocked = true; break; }
                else gap = true;
            }
            if (!blocked) return { matchable: true, points: (isImmediateVertical && !gap) ? 1 : 4, special: gap };
        }

        // Diagonal check
        if (Math.abs(row1 - row2) === Math.abs(col1 - col2)) {
            let blocked = false; let gap = false;
            const rStep = row2 > row1 ? 1 : -1; const cStep = col2 > col1 ? 1 : -1;
            let currR = row1 + rStep; let currC = col1 + cStep;
            while (currR !== row2) {
                if (this.board[currR * GRID_COLS + currC].state === STATE.ACTIVE) { blocked = true; break; }
                else gap = true;
                currR += rStep; currC += cStep;
            }
            if (!blocked) return { matchable: true, points: (isImmediateDiagonal && !gap) ? 1 : 4, special: gap };
        }

        return { matchable: false };
    }

    executeMatch(idx1, idx2, basePoints, isSpecial) {
        const val1 = this.board[idx1].value;
        const points = basePoints * this.fase;
        
        this.board[idx1].state = STATE.NULL;
        this.board[idx2].state = STATE.NULL;
        this.selectedIndices = [];
        this.score += points;
        
        // Check if number is completely eliminated from grid
        this.checkNumberEliminated(val1);

        // Show Special Message
        if (isSpecial) {
            this.showBienVisto();
        }

        // Visual Effects: Attraction and Particles
        this.createMatchEffects(idx1, idx2);

        // Score Animation
        this.animatePoints(idx1, idx2, points);

        // Delay logic for cleanup to allow animations to be seen
        setTimeout(() => {
            this.checkRowClear();
            if (this.board.every(c => c.state === STATE.NULL)) this.handlePhaseAdvance();
            else this.checkGameOver();
            this.updateHighScores();
            this.render();
            this.saveBoard();
        }, 600); 

        // Scoring and Persistence
        this.stats.matches++;
        this.stats.totalPoints += points;
        this.checkAchievements();
        this.saveStats();
    }

    checkAchievements() {
        const check = (id, condition, text) => {
            if (condition && !this.stats.achievements.includes(id)) {
                this.stats.achievements.push(id);
                this.showToast(`🏆 LOGRO: ${text} 🏆`);
            }
        };

        check('first_match', this.stats.matches >= 1, "Primeros Pasos");
        check('centurion', this.stats.matches >= 100, "Centurión del Número");
        check('line_king', this.stats.linesCleared >= 50, "Rey de las Líneas");
        check('survivor', this.fase >= 5, "Superviviente");
        
        this.saveStats();
    }

    checkNumberEliminated(val) {
        const remains = this.board.some(c => c.state === STATE.ACTIVE && c.value == val);
        if (!remains) {
            setTimeout(() => {
                this.showToast(`🔥 ¡HAS ELIMINADO TODOS LOS ${val}! 🔥`);
            }, 600);
        }
    }

    animatePoints(idx1, idx2, points) {
        const cells = document.querySelectorAll('.grid-cell');
        const c1 = cells[idx1];
        const c2 = cells[idx2];
        if (!c1 || !c2) return;

        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();
        const scoreTarget = this.scoreElement.getBoundingClientRect();

        // 1. Create Floating Label at the center of the match
        const label = document.createElement('div');
        label.className = 'floating-score animate-pop';
        label.innerText = `+${points}`;
        
        const centerX = (r1.left + r2.left) / 2 + r1.width / 2;
        const centerY = (r1.top + r2.top) / 2 + r1.height / 2;
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        label.style.left = `${centerX + scrollX}px`;
        label.style.top = `${centerY + scrollY}px`;
        document.body.appendChild(label);

        // 2. Trajectory towards the goal (after a small pause for pop animation)
        setTimeout(() => {
            const destX = scoreTarget.left + scoreTarget.width / 2;
            const destY = scoreTarget.top + scoreTarget.height / 2;

            label.style.transform = `translate(${destX - centerX}px, ${destY - centerY}px) scale(0.5)`;
            label.style.opacity = '0';

            // Impact and Score Update (Extended to match CSS 1.2s transition)
            setTimeout(() => {
                if (label.parentNode) document.body.removeChild(label);
                this.triggerScoreImpact();
            }, 1100);
        }, 400);
    }

    triggerScoreImpact() {
        this.scoreElement.classList.add('score-impact');
        setTimeout(() => {
            this.scoreElement.classList.remove('score-impact');
        }, 300);
        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        if (this.isScoreCounting) return;
        this.isScoreCounting = true;
        
        const step = () => {
            const increment = Math.ceil((this.score - this.visualScore) / 5) || 1;
            if (this.visualScore < this.score) {
                this.visualScore = Math.min(this.visualScore + increment, this.score);
                this.scoreElement.innerText = this.formatScore(this.visualScore);
                requestAnimationFrame(step);
            } else {
                this.isScoreCounting = false;
            }
        };
        step();
    }

    handlePhaseAdvance() {
        const bonus = 150 * this.fase;
        this.score += bonus;
        this.stats.totalPoints += bonus;
        this.stats.won++;
        this.fase++;
        if (this.fase > this.stats.maxFase) this.stats.maxFase = this.fase;
        this.checkAchievements();
        this.saveStats();
        
        // Confetti!
        this.shootConfetti();
        
        this.hintCount = 5;
        this.addCount = 5;
        this.initBoard();
        this.saveBoard();
        this.render();
    }

    shootConfetti() {
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * window.innerWidth;
            const y = window.innerHeight + 10;
            this.createParticle(x, y); // Resuamos partículas para confeti rápido
        }
    }

    updateHighScores() {
        if (this.score > this.dailyHighScore) {
            this.dailyHighScore = this.score;
            localStorage.setItem('myNumberDailyHighScore', this.dailyHighScore);
        }
        if (this.score > this.allTimeHighScore) {
            this.allTimeHighScore = this.score;
            localStorage.setItem('myNumberHighScore', this.allTimeHighScore);
        }
    }

    showToast(text) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = text;
        
        container.innerHTML = ''; // Limpiar anterior
        container.appendChild(toast);
        container.style.display = 'block';

        setTimeout(() => {
            toast.classList.add('out');
            setTimeout(() => {
                container.style.display = 'none';
                container.innerHTML = '';
            }, 300);
        }, 3500); // 3.5 segundos de visualización
    }

    handlePhaseAdvance() {
        this.fase++;
        if (this.fase > this.stats.maxFase) {
            this.stats.maxFase = this.fase;
            this.saveStats();
        }
        this.addCount = 5;
        this.hintCount = 5;
        this.initBoard();
        this.saveBoard();
        this.render();
        this.showToast(`🎉 ¡FASE ${this.fase} ALCANZADA! 🎉`);
        
        // Premium Celebration: Confetti
        for (let i = 0; i < 60; i++) {
            this.createParticle(Math.random() * window.innerWidth, -20, true);
        }
    }

    checkRowClear() {
        let rowsToRemove = [];
        for (let r = 0; r < Math.ceil(this.board.length / GRID_COLS); r++) {
            const row = this.board.slice(r * GRID_COLS, (r + 1) * GRID_COLS);
            if (row.length === GRID_COLS && row.every(c => c.state === STATE.NULL)) rowsToRemove.push(r);
        }
        for (let i = rowsToRemove.length - 1; i >= 0; i--) {
            const rowIndex = rowsToRemove[i];
            const pointsForLine = 20 * this.fase;
            
            this.board.splice(rowIndex * GRID_COLS, GRID_COLS);
            this.score += pointsForLine;
            this.stats.totalPoints += pointsForLine;
            this.stats.linesCleared++;
            
            this.showToast(`✨ LÍNEA COMPLETADA +${pointsForLine} ✨`);
        }
        if (rowsToRemove.length > 0) {
            this.saveStats();
            this.saveBoard();
        }
    }

    addNumbers() {
        if (this.addCount <= 0) return;
        this.groupCount++;
        const actives = this.board.filter(c => c.state === STATE.ACTIVE).map(c => ({ 
            value: c.value, 
            state: STATE.ACTIVE,
            group: this.groupCount
        }));
        if (actives.length > 0) {
            this.board = [...this.board, ...actives];
            this.addCount--;
            this.stats.numbersAdded++;
            this.saveStats();
            this.saveBoard();
            this.render();
            this.checkGameOver();
        }
    }

    checkGameOver() {
        if (this.addCount > 0) return;
        let movePossible = false;
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i].state !== STATE.ACTIVE) continue;
            for (let j = i + 1; j < this.board.length; j++) {
                if (this.getMatchInfo(i, j).matchable) { movePossible = true; break; }
            }
            if (movePossible) break;
        }
        if (!movePossible) {
            this.stats.lost++;
            this.saveStats();
            this.saveToRanking();
            this.finalScoreElement.innerText = this.score;
            this.gameOverOverlay.classList.add('active');
        }
    }

    saveToRanking() {
        if (this.score < 50) return; // Don't save very low scores
        const entry = { 
            score: this.score, 
            fase: this.fase,
            date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) 
        };
        this.ranking.push(entry);
        this.ranking.sort((a, b) => b.score - a.score);
        this.ranking = this.ranking.slice(0, 10);
        localStorage.setItem('myNumberRanking', JSON.stringify(this.ranking));
    }

    renderRanking() {
        const podium   = document.getElementById('podium-section');
        const list     = document.getElementById('ranking-compact-list');
        if (!podium || !list) return;

        // Sample data for first-time users
        let data = this.ranking.length > 0 ? this.ranking : [
            { score: 5587, date: '11 mar' },
            { score: 3178, date: '10 mar' },
            { score: 1916, date: '09 mar' }
        ];

        const avatars = ['🥇', '🥈', '🥉'];
        const medals  = ['1', '2', '3'];
        const classes = ['first', 'second', 'third'];

        // Build podium — always show 3 slots even if data is missing
        // Order on screen: 2nd (left), 1st (center), 3rd (right)
        const podiumOrder = [1, 0, 2]; // indices into data array
        podium.innerHTML = '';
        podiumOrder.forEach(dataIdx => {
            const entry    = data[dataIdx];
            const rankIdx  = dataIdx; // 0=1st, 1=2nd, 2=3rd
            const player   = document.createElement('div');
            const isEmpty  = !entry;

            player.className = `podium-player ${classes[rankIdx]}${isEmpty ? ' podium-empty' : ''}`;
            player.innerHTML = `
                <div class="podium-avatar">${isEmpty ? '?' : avatars[rankIdx]}</div>
                <div class="podium-score">${isEmpty ? '--' : this.formatScore(entry.score)}</div>
                <div class="podium-date">${isEmpty ? '' : (entry.fase ? 'Fase ' + entry.fase + ' · ' : '') + entry.date}</div>
                <div class="podium-bar">
                    <span class="podium-rank">${medals[rankIdx]}</span>
                </div>
            `;
            podium.appendChild(player);
        });

        // Compact list for positions 4 and beyond
        list.innerHTML = '';
        const rest = data.slice(3);
        if (rest.length === 0) {
            list.innerHTML = '<div class="compact-empty">Juega más partidas para llenar el ranking 🎮</div>';
            return;
        }
        const icons = ['4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
        rest.forEach((entry, i) => {
            const row = document.createElement('div');
            row.className = 'compact-row';
            row.innerHTML = `
                <span class="compact-pos">#${i + 4}</span>
                <span class="compact-icon">${icons[i] || '🎮'}</span>
                <div class="compact-info">
                    <div class="compact-score">${this.formatScore(entry.score)}</div>
                    <div class="compact-date">${entry.fase ? 'Fase ' + entry.fase + ' · ' : ''}${entry.date}</div>
                </div>
            `;
            list.appendChild(row);
        });
    }

    renderStats() {
        document.getElementById('stats-won').innerText = this.stats.won;
        document.getElementById('stats-lost').innerText = this.stats.lost;
        document.getElementById('stats-matches').innerText = this.stats.matches;
        document.getElementById('stats-lines').innerText = this.stats.linesCleared;
        document.getElementById('stats-hints').innerText = this.stats.hintsUsed || 0;
        document.getElementById('stats-adds').innerText = this.stats.numbersAdded || 0;
        document.getElementById('stats-max-fase').innerText = this.stats.maxFase || 1;
        document.getElementById('stats-total-points').innerText = this.formatScore(this.stats.totalPoints || 0);
    }

    createMatchEffects(i1, i2) {
        const cells = document.querySelectorAll('.grid-cell');
        const c1 = cells[i1];
        const c2 = cells[i2];
        if (!c1 || !c2) return;

        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();

        const midX = (r1.left + r2.left) / 2 + r1.width / 2;
        const midY = (r1.top + r2.top) / 2 + r1.height / 2;

        [c1, c2].forEach(c => {
            const rect = c.getBoundingClientRect();
            const dx = midX - (rect.left + rect.width / 2);
            const dy = midY - (rect.top + rect.height / 2);
            c.style.transition = 'transform 0.5s cubic-bezier(0.6, -0.28, 0.735, 0.045), opacity 0.4s ease-out';
            c.style.transform = `translate(${dx}px, ${dy}px) scale(0.1) rotate(180deg)`;
            c.style.opacity = '0';
        });

        for (let i = 0; i < 12; i++) {
            this.createParticle(midX, midY);
        }
    }

    createParticle(x, y, isConfetti = false) {
        const p = document.createElement('div');
        p.className = 'particle';
        const colors = isConfetti ? ['#ff2d55', '#34c759', '#007aff', '#ffcc00', '#ff9500', '#af52de'] : ['#007aff', '#5ac8fa', '#00f2fe', '#ffffff'];
        p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;
        p.style.left = (x + scrollX) + 'px';
        p.style.top = (y + scrollY) + 'px';
        if (isConfetti) {
            p.style.width = '10px';
            p.style.height = '10px';
            p.style.borderRadius = '50%';
        }
        document.body.appendChild(p);

        const angle = isConfetti ? (Math.PI / 4 + Math.random() * Math.PI / 2) : (Math.random() * Math.PI * 2);
        const dist = isConfetti ? (400 + Math.random() * 400) : (20 + Math.random() * 50);
        const tx = Math.cos(angle) * dist;
        const ty = isConfetti ? (window.innerHeight + 100) : (Math.sin(angle) * dist);

        p.animate([
            { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
            { transform: `translate(${tx}px, ${ty}px) rotate(${Math.random() * 360}deg) scale(${isConfetti ? 0.5 : 0})`, opacity: isConfetti ? 0.7 : 0 }
        ], {
            duration: isConfetti ? (1500 + Math.random() * 1000) : (600 + Math.random() * 400),
            easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)'
        }).onfinish = () => p.remove();
    }

    showHint() {
        if (this.hintCount <= 0) return;
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i].state !== STATE.ACTIVE) continue;
            for (let j = i + 1; j < this.board.length; j++) {
                const info = this.getMatchInfo(i, j);
                if (info.matchable) {
                    this.drawHintConnection(i, j);
                    this.hintCount--;
                    this.stats.hintsUsed++;
                    this.saveStats();
                    this.render();
                    return;
                }
            }
        }
        this.openModal("Sin movimientos", "¡No quedan parejas posibles! Añade más números.", () => {});
    }

    drawHintConnection(idx1, idx2) {
        const cells = document.querySelectorAll('.grid-cell');
        const c1 = cells[idx1];
        const c2 = cells[idx2];
        if (!c1 || !c2) return;

        this.hintOverlay.innerHTML = '';
        this.hintOverlay.classList.add('active');

        const boardRect = this.gridElement.getBoundingClientRect();
        const r1 = c1.getBoundingClientRect();
        const r2 = c2.getBoundingClientRect();

        c1.classList.add('hint-cell-highlight');
        c2.classList.add('hint-cell-highlight');

        // Center points
        const x1 = r1.left - boardRect.left + r1.width / 2;
        const y1 = r1.top - boardRect.top + r1.height / 2;
        const x2 = r2.left - boardRect.left + r2.width / 2;
        const y2 = r2.top - boardRect.top + r2.height / 2;

        // Math for rotation and distance
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        const bridge = document.createElement('div');
        bridge.className = 'hint-bridge';
        bridge.style.width = `${distance}px`;
        bridge.style.left = `${x1}px`;
        bridge.style.top = `${y1}px`;
        bridge.style.transform = `rotate(${angle}deg)`;

        this.hintOverlay.appendChild(bridge);

        setTimeout(() => {
            c1.classList.remove('hint-cell-highlight');
            c2.classList.remove('hint-cell-highlight');
            this.hintOverlay.innerHTML = '';
            this.hintOverlay.classList.remove('active');
        }, 3000); 
    }

    formatScore(num) { return num.toLocaleString('de-DE'); }

    render() {
        this.gridElement.innerHTML = '';
        this.scoreElement.innerText = this.visualScore;
        this.faseElement.innerText = this.fase;
        this.addCountElement.innerText = this.addCount;
        this.hintCountElement.innerText = this.hintCount;

        const displayHS = (this.score > this.dailyHighScore) ? this.allTimeHighScore : this.dailyHighScore;
        this.highScoreElement.innerText = this.formatScore(displayHS);

        const activeVals = new Set(this.board.filter(c => c.state === STATE.ACTIVE).map(c => Number(c.value)));
        document.querySelectorAll('.eliminated-numbers span').forEach(span => {
            span.style.opacity = activeVals.has(Number(span.innerText)) ? '1' : '0.15';
        });

        this.board.forEach((cell, index) => {
            const div = document.createElement('div');
            div.className = 'grid-cell';
            if (cell.state === STATE.NULL) div.classList.add('cell-eliminated');
            else {
                const color = DARK_PALETTE[cell.group % DARK_PALETTE.length] || DARK_PALETTE[0];
                div.style.color = color;
            }
            if (this.selectedIndices.includes(index)) { 
                div.classList.add('selected');
            }
            
            div.innerText = cell.value;
            div.addEventListener('click', () => {
                if (cell.state !== STATE.ACTIVE) return;
                let matchMade = false;
                if (this.selectedIndices.includes(index)) {
                     this.selectedIndices = [];
                } else if (this.selectedIndices.length === 0) {
                     this.selectedIndices.push(index);
                } else {
                    const info = this.getMatchInfo(this.selectedIndices[0], index);
                    if (info.matchable) {
                        this.executeMatch(this.selectedIndices[0], index, info.points, info.special);
                        matchMade = true;
                    } else {
                        this.selectedIndices = [index];
                    }
                }
                if (!matchMade) this.render();
            });
            this.gridElement.appendChild(div);
        });

        for (let i = this.board.length; i < TOTAL_CELL_SCREEN; i++) {
            this.gridElement.appendChild(document.createElement('div')).className = 'grid-cell';
        }
    }
}

window.onload = () => new MyNumberGame();

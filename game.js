/**
 * MYNUMBER (STARTER EDITION)
 * Management of Views, Ranking, Phase Refills, and Hints with Connections.
 */

const GRID_COLS = 9;
const INITIAL_TARGET_CELLS = 35;
const VISIBLE_ROWS = 10; 
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
        console.log("GAME V56: Constructor started");
        window.GAME = this; // Set early
        this.board = []; 
        this.selectedIndices = [];
        this.score = 0; 
        this.visualScore = 0; 
        
        // Load Scores & Stats with error handling
        try {
            this.allTimeHighScore = parseInt(localStorage.getItem('myNumberHighScore')) || 0;
            this.dailyHighScore = parseInt(localStorage.getItem('myNumberDailyHighScore')) || 0;
            this.ranking = JSON.parse(localStorage.getItem('myNumberRanking')) || [];
            const savedStats = JSON.parse(localStorage.getItem('myNumberStats')) || {};
            const defaultStats = {
                won: 0, lost: 0, matches: 0, linesCleared: 0, hintsUsed: 0, numbersAdded: 0,
                maxFase: 1, totalPoints: 0, lives: 3, achievements: [],
                timeToday: 0, timeWeek: 0, timeTotal: 0, streak: 0, bestTime: 0, lastPlayDate: null
            };
            this.stats = { ...defaultStats, ...savedStats };
            this.playerName = localStorage.getItem('myNumberPlayerName') || 'Jugador';
            this.checkStreak();
        } catch (e) {
            console.error("Storage load failed:", e);
            this.allTimeHighScore = 0;
            this.dailyHighScore = 0;
            this.ranking = [];
            this.stats = {
                won: 0, lost: 0, matches: 0, linesCleared: 0, hintsUsed: 0, numbersAdded: 0,
                maxFase: 1, totalPoints: 0, lives: 3, achievements: [],
                timeToday: 0, timeWeek: 0, timeTotal: 0, streak: 0, bestTime: 0, lastPlayDate: null
            };
            this.playerName = 'Jugador';
        }
        
        this.groupCount = 0;
        this.currentScreen = 'home';
        
        this.checkDailyReset();

        this.fase = 1;
        this.addCount = 5;
        this.hintCount = 5;
        this.saveStats(); // Ensure initial stats/lives exist in storage
        console.log("GAME V36: Initializing DOM...");
        this.initDOM();
        
        // Load Board or Init with safe defaults
        try {
            if (!this.loadBoard()) {
                this.initBoard();
            }
        } catch(e) {
            console.error("Error loading board:", e);
            this.initBoard();
        }
        
        this.render();
        
        // Timer for played time
        this.sessionStartTime = Date.now();
        this.phaseStartTime = Date.now();
        setInterval(() => this.updateTimeStats(), 5000); // Every 5 seconds
    }

    saveBoard() {
        const boardData = {
            board: this.board,
            score: this.score,
            fase: this.fase,
            addCount: this.addCount,
            hintCount: this.hintCount,
            groupCount: this.groupCount,
            phaseStartTime: this.phaseStartTime
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
            this.phaseStartTime = data.phaseStartTime || Date.now();
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
        console.log("GAME V47: initDOM() started");
        this.gridElement = document.getElementById('game-board');
        try {
            this.onetGame = new OnetGame(this); 
            if (typeof MahjongController !== 'undefined') {
                console.log("GAME V47: Mahjong subsystem found.");
                this.mahjongController = new MahjongController(
                    new MahjongView('mahjong-container'),
                    () => {
                        this.stats.lives++;
                        this.saveStats();
                        this.updateHeader();
                        this.showToast("¡Has ganado 1 ❤️!");
                        this.switchScreen('home');
                    }
                );
            }
        } catch (e) {
            console.error("Failed to initialize minigames:", e);
        }
        
        // Modal buttons logic - updated to handle multiple modals safely
        this.scoreElement = document.getElementById('score');
        this.highScoreElement = document.getElementById('high-score');
        this.faseElement = document.getElementById('fase');
        this.eliminatedContainer = document.querySelector('.eliminated-numbers');
        this.hintOverlay = document.getElementById('hint-overlay');
        
        this.addBtn = document.getElementById('add-btn');
        this.hintBtn = document.getElementById('hint-btn');
        this.addCountElement = document.getElementById('add-count');
        this.hintCountElement = document.getElementById('hint-count');

        const handleAdd = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.addNumbers();
        };
        const handleHint = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.showHint();
        };
        const handleContinue = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.switchScreen('game');
        };

        this.addBtn.addEventListener('click', handleAdd);
        this.addBtn.addEventListener('touchstart', handleAdd, { passive: false });
        this.hintBtn.addEventListener('click', handleHint);
        this.hintBtn.addEventListener('touchstart', handleHint, { passive: false });
        
        this.homeHS = document.getElementById('home-high-score');
        this.gameOverOverlay = document.getElementById('game-over-overlay');
        this.finalScoreElement = document.getElementById('final-score');

        const handleEditName = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.changeName();
        };
        const editNameBtn = document.getElementById('edit-name-btn');
        if (editNameBtn) {
            editNameBtn.addEventListener('click', handleEditName);
            editNameBtn.addEventListener('touchstart', handleEditName, { passive: false });
        }

        const cardClassic = document.getElementById('card-play-1');
        if (cardClassic) {
            const startClassic = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                console.log("Starting Classic Game...");
                this.startNewGame();
            };
            cardClassic.addEventListener('click', startClassic);
            cardClassic.addEventListener('touchstart', startClassic, { passive: false });
        }

        const cardMarathon = document.getElementById('card-play-2');
        if (cardMarathon) {
            const startOnet = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                console.log("Starting Onet Minigame...");
                if (this.onetGame) this.onetGame.start();
            };
            cardMarathon.addEventListener('click', startOnet);
            cardMarathon.addEventListener('touchstart', startOnet, { passive: false });
        }

        const cardMahjong = document.getElementById('card-play-3');
        if (cardMahjong) {
            cardMahjong.addEventListener('click', () => this.triggerMahjongGame());
            cardMahjong.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.triggerMahjongGame();
            }, { passive: false });
        }
        
        const btnNewGame = document.getElementById('btn-new-game');
        if (btnNewGame) {
            const startNew = (e) => {
                if (e.type === 'touchstart') e.preventDefault();
                this.startNewGame();
            };
            btnNewGame.addEventListener('click', startNew);
            btnNewGame.addEventListener('touchstart', startNew, { passive: false });
        }

        const btnContinue = document.getElementById('btn-continue');
        if (btnContinue) {
            btnContinue.addEventListener('click', handleContinue);
            btnContinue.addEventListener('touchstart', handleContinue, { passive: false });
        }

        // Bottom Nav
        const bindButton = (id, callback, preventDefault = true) => {
            const el = document.getElementById(id);
            if (!el) return;
            const handler = (e) => {
                if (preventDefault) e.preventDefault();
                callback();
            };
            el.addEventListener('click', handler);
            el.addEventListener('touchstart', handler, { passive: !preventDefault });
        };

        bindButton('nav-home', () => this.switchScreen('home'));
        bindButton('nav-ranking', () => this.switchScreen('ranking'));
        bindButton('nav-stats', () => this.switchScreen('stats'));

        // All Back Buttons
        ['back-to-home', 'back-to-home-ranking', 'back-to-home-stats', 'go-home', 'mahjong-quit-btn'].forEach(id => {
            bindButton(id, () => {
                if (this.mahjongController) this.mahjongController.enPartida = false;
                this.switchScreen('home');
            });
        });

        // Settings & General
        ['settings-btn-home', 'settings-btn-game'].forEach(id => {
            bindButton(id, () => this.showToast("Ajustes: Próximamente ⚙️"));
        });
        bindButton('go-new-game', () => this.startNewGame());

        this.updateHeader();
        this.checkAchievements();
    }

    startMahjongMinigame() {
        console.warn("LEGACY CALL: startMahjongMinigame (please update to triggerMahjongGame)");
        this.triggerMahjongGame();
    }

    triggerMahjongGame() {
        console.log("CRITICAL: triggerMahjongGame CALLED");
        if (!this.mahjongController) {
            console.error("FATAL: Mahjong Controller is missing!");
            if (window.MahjongController) {
                console.log("Attempting emergency re-init of Mahjong Controller...");
                const view = new window.MahjongView('mahjong-container');
                this.mahjongController = new window.MahjongController(view, () => {
                    this.stats.lives++;
                    this.saveStats();
                    this.updateHeader();
                    this.showToast("¡Has ganado 1 ❤️!");
                    this.switchScreen('home');
                });
            }
        }

        this.switchScreen('mahjong');
        
        if (this.mahjongController && window.generarLayoutMahjong) {
            try {
                const layout = window.generarLayoutMahjong();
                console.log("CRITICAL: Layout generated with items:", layout.length);
                this.mahjongController.iniciarJuego(layout);
                console.log("CRITICAL: iniciarJuego process finished");
            } catch(err) {
                console.error("CRITICAL ERROR starting Mahjong:", err);
                alert("Error crítico Mahjong: " + err.message);
            }
        } else {
            console.error("CRITICAL: Dependencies still missing. Controller:", !!this.mahjongController, "LayoutGen:", !!window.generarLayoutMahjong);
            alert("Error: Faltan componentes de Mahjong. Por favor recarga.");
        }
    }

    updateHeader() {
        document.getElementById('display-name').innerText = this.playerName;
        
        const homeLives = document.getElementById('home-coin-count');
        const gameLives = document.getElementById('game-coin-count');
        if (homeLives) homeLives.innerText = this.stats.lives || 0;
        if (gameLives) gameLives.innerText = this.stats.lives || 0;

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
        console.log("GAME V44: switchScreen ->", screenId);
        this.currentScreen = screenId;
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const el = document.getElementById(`${screenId}-screen`);
        if (el) el.classList.add('active');

        // Toggle fullscreen mode for Mahjong - V44 Bulletproof
        const isMahjong = screenId === 'mahjong';
        console.log("DEBUG: Setting mj-fullscreen class ->", isMahjong);
        document.body.classList.toggle('mj-fullscreen', isMahjong);
        document.querySelector('.app-container')?.classList.toggle('mj-fullscreen', isMahjong);
        
        // Ensure overlays are closed when navigating
        if (this.gameOverOverlay) this.gameOverOverlay.classList.remove('active');
        document.getElementById('modal-confirm')?.classList.remove('active');
        if (this.onetGame) {
            document.getElementById('onet-result-overlay')?.classList.remove('active');
            document.getElementById('onet-start-overlay')?.classList.remove('active');
        }

        if (screenId === 'home' && this.homeHS) {
            this.homeHS.innerText = this.formatScore(this.allTimeHighScore);
            this.updateStatsDisplay();
        }
        if (screenId === 'ranking') this.renderRanking();
        if (screenId === 'stats') this.renderStats();
    }

    updateStatsDisplay() {
        // We can update a lives counter in the UI here if needed
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
        this.phaseStartTime = Date.now(); // Initialize timer
        this.gameOverOverlay.classList.remove('active');
        this.initBoard();
        this.saveBoard();
        this.switchScreen('game');
        this.render();
    }

    openModal(title, text, onConfirm, onCancel = null) {
        const modal = document.getElementById('modal-confirm');
        const titleEl = document.getElementById('modal-title');
        const textEl = document.getElementById('modal-text');
        const confirmBtn = document.getElementById('modal-confirm-btn');
        const cancelBtn = document.getElementById('modal-cancel-btn');

        titleEl.innerText = title;
        textEl.innerText = text;
        modal.classList.add('active');

        // Clean up previous listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);

        const close = () => {
            modal.classList.remove('active');
        };

        const handleConfirm = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            modal.classList.remove('active');
            onConfirm();
        };

        const handleCancel = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            modal.classList.remove('active');
            if (onCancel) onCancel();
        };

        newConfirmBtn.addEventListener('click', handleConfirm);
        newConfirmBtn.addEventListener('touchstart', handleConfirm, { passive: false });
        newCancelBtn.addEventListener('click', handleCancel);
        newCancelBtn.addEventListener('touchstart', handleCancel, { passive: false });
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
        
        // Record best time (time for this phase)
        const phaseDuration = Math.floor((Date.now() - (this.phaseStartTime || Date.now())) / 1000);
        if (phaseDuration > 2) { // Minimum 2s to avoid glitches
            if (!this.stats.bestTime || phaseDuration < this.stats.bestTime) {
                this.stats.bestTime = phaseDuration;
            }
        }
        this.phaseStartTime = Date.now();
        
        this.checkAchievements();
        this.saveStats();
        
        this.showToast(`🎉 ¡FASE ${this.fase} ALCANZADA! 🎉`);
        
        // Premium Celebration: Confetti
        for (let i = 0; i < 60; i++) {
            this.createParticle(Math.random() * window.innerWidth, -20, true);
        }
        
        this.hintCount = 5;
        this.addCount = 5;
        this.initBoard();
        this.saveBoard();
        this.render();
    }

    checkStreak() {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        
        if (!this.stats.lastPlayDate) {
            this.stats.streak = 1;
        } else {
            const lastDate = new Date(this.stats.lastPlayDate);
            const diffDays = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === 1) {
                this.stats.streak++;
            } else if (diffDays > 1) {
                this.stats.streak = 1;
            }
        }
        this.stats.lastPlayDate = todayStr;
        this.saveStats();
    }
    
    updateTimeStats() {
        const now = Date.now();
        if (!this.sessionStartTime) this.sessionStartTime = now;
        const diffSeconds = Math.floor((now - this.sessionStartTime) / 1000);
        this.sessionStartTime = now;
        
        if (diffSeconds > 0 && (this.currentScreen === 'game' || this.currentScreen === 'onet')) {
            this.stats.timeToday = (this.stats.timeToday || 0) + diffSeconds;
            this.stats.timeWeek = (this.stats.timeWeek || 0) + diffSeconds;
            this.stats.timeTotal = (this.stats.timeTotal || 0) + diffSeconds;
            this.saveStats();
        }
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
        if (this.addCount <= 0) {
            if (this.stats.lives > 0) {
                this.openModal("Añadir Números ➕", "¿Usar 1 ❤️ para conseguir 3 usos extra?", () => {
                    this.stats.lives--;
                    this.addCount += 3;
                    this.updateHeader();
                    this.saveStats();
                    this.render();
                    this.showToast("❤️ Vida cambiada por usos extra ❤️");
                });
            } else {
                this.showToast("No quedan Añadidos ni Vidas ❤️");
            }
            return;
        }
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
        // Enforce checking if there's any active moves before actually losing
        let movePossible = false;
        for (let i = 0; i < this.board.length; i++) {
            if (this.board[i].state !== STATE.ACTIVE) continue;
            for (let j = i + 1; j < this.board.length; j++) {
                if (this.getMatchInfo(i, j).matchable) { movePossible = true; break; }
            }
            if (movePossible) break;
        }
        if (!movePossible) {
            if (this.addCount > 0) return; // Si hay addCount no hacemos nada extra, el jugador debe decidir usar el botón

            if (this.stats.lives > 0) {
                this.openModal(
                    "¡Bloqueado! 💔",
                    "Te has quedado sin movimientos. ¿Quieres usar 1 ❤️ para añadir más números y seguir jugando?", 
                    () => {
                        this.stats.lives--;
                        this.addCount += 1; // Un solo uso es suficiente para barajar o volver a añadir
                        this.updateHeader();
                        this.saveStats();
                        this.showToast("❤️ ¡Vida usada! +1 a Añadir Números ❤️");
                        this.addNumbers();
                    },
                    () => { this.endGameFinal(); }
                );
            } else {
                this.endGameFinal();
            }
        }
    }

    endGameFinal() {
        this.stats.lost++;
        this.saveStats();
        this.saveToRanking();
        this.finalScoreElement.innerText = this.score;
        this.gameOverOverlay.classList.add('active');
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

        // New stats
        if (document.getElementById('stats-time-today'))
            document.getElementById('stats-time-today').innerText = this.formatTime(this.stats.timeToday || 0);
        if (document.getElementById('stats-time-week'))
            document.getElementById('stats-time-week').innerText = this.formatTime(this.stats.timeWeek || 0);
        if (document.getElementById('stats-time-total'))
            document.getElementById('stats-time-total').innerText = this.formatTime(this.stats.timeTotal || 0);
        if (document.getElementById('stats-streak'))
            document.getElementById('stats-streak').innerText = this.stats.streak || 0;
        if (document.getElementById('stats-best-time'))
            document.getElementById('stats-best-time').innerText = this.stats.bestTime ? this.formatTimer(this.stats.bestTime) : '--:--';
    }

    formatTime(seconds) {
        if (seconds < 60) return `${seconds}s`;
        const mins = Math.floor(seconds / 60);
        if (mins < 60) return `${mins}m`;
        const hours = (mins / 60).toFixed(1);
        return `${hours}h`;
    }

    formatTimer(seconds) {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
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
        if (this.hintCount <= 0) {
            if (this.stats.lives > 0) {
                this.openModal("Más Pistas 💡", "¿Usar 1 ❤️ para conseguir 3 pistas extra?", () => {
                    this.stats.lives--;
                    this.hintCount += 3;
                    this.updateHeader();
                    this.saveStats();
                    this.render();
                    this.showToast("❤️ Vida cambiada por 3 Pistas extra ❤️");
                });
            } else {
                this.showToast("No te quedan Pistas ni Vidas ❤️");
            }
            return;
        }
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
            const handleInteraction = (e) => {
                if (e.type === 'touchstart') e.preventDefault(); // Evitar double-tap o retraso
                if (cell.state !== STATE.ACTIVE) return;
                
                let matchMade = false;
                if (this.selectedIndices.includes(index)) {
                     this.selectedIndices = [];
                } else if (this.selectedIndices.length === 0) {
                     this.selectedIndices.push(index);
                     if (navigator.vibrate) navigator.vibrate(5);
                } else {
                    const info = this.getMatchInfo(this.selectedIndices[0], index);
                    if (info.matchable) {
                        this.executeMatch(this.selectedIndices[0], index, info.points, info.special);
                        matchMade = true;
                        if (navigator.vibrate) navigator.vibrate(20);
                    } else {
                        this.selectedIndices = [index];
                        if (navigator.vibrate) navigator.vibrate(5);
                    }
                }
                if (!matchMade) this.render();
            };

            div.addEventListener('click', handleInteraction);
            div.addEventListener('touchstart', handleInteraction, { passive: false });
            this.gridElement.appendChild(div);
        });

        for (let i = this.board.length; i < TOTAL_CELL_SCREEN; i++) {
            this.gridElement.appendChild(document.createElement('div')).className = 'grid-cell';
        }
    }
}

// Iniciar directamente para evitar retrasos de window.onload en moviles
new MyNumberGame();
console.log("GAME V36: Bootstrapping complete.");

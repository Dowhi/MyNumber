/**
 * ONET MINIGAME - CONNECTION OF PAIRS
 * Designed for rewarding lives in MyNumber.
 */

class OnetGame {
    constructor(parentGame) {
        this.parent = parentGame;
        this.board = [];
        this.rows = 10;
        this.cols = 6;
        this.icons = ['🌀', '⚡', '⭐', '🔥', '💎', '🍀', '🍎', '🐱', '🚀', '🌙', '⚔️', '🧪'];
        this.selectedTile = null;
        this.pairsFound = 0;
        this.totalPairs = 15;
        this.timeLeft = 60;
        this.timer = null;
        this.isGameOver = false;

        this.initDOM();
        this.bindEvents();
    }

    initDOM() {
        this.screen = document.getElementById('onet-screen');
        this.boardEl = document.getElementById('onet-board');
        this.canvas = document.getElementById('onet-canvas');
        if (!this.screen || !this.boardEl || !this.canvas) {
            console.warn("OnetGame: Required DOM elements not found.");
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.timerBar = document.getElementById('onet-timer-bar');
        this.resultText = document.getElementById('onet-result-text');
        
        this.helpModal = document.getElementById('onet-help-modal');
        this.helpBtn = document.getElementById('onet-help-btn');
        this.helpCloseBtn = document.getElementById('onet-help-close');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        if (!this.boardEl || !this.canvas) return;
        const rect = this.boardEl.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    bindEvents() {
        const closeBtn = document.getElementById('onet-close-btn');
        const hintBtn = document.getElementById('onet-hint-btn');
        
        const handleClose = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            if (this.isGameOver) this.close();
        };
        const handleHint = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            this.showHint();
        };
        const handleHelp = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            if (this.helpModal) this.helpModal.classList.add('active');
        };
        const handleHelpClose = (e) => {
            if (e.type === 'touchstart') e.preventDefault();
            if (this.helpModal) this.helpModal.classList.remove('active');
        };

        if (closeBtn) {
            closeBtn.addEventListener('click', handleClose);
            closeBtn.addEventListener('touchstart', handleClose, { passive: false });
        }
        if (hintBtn) {
            hintBtn.addEventListener('click', handleHint);
            hintBtn.addEventListener('touchstart', handleHint, { passive: false });
        }
        if (this.helpBtn) {
            this.helpBtn.addEventListener('click', handleHelp);
            this.helpBtn.addEventListener('touchstart', handleHelp, { passive: false });
        }
        if (this.helpCloseBtn) {
            this.helpCloseBtn.addEventListener('click', handleHelpClose);
            this.helpCloseBtn.addEventListener('touchstart', handleHelpClose, { passive: false });
        }
    }

    start() {
        this.isGameOver = false;
        this.pairsFound = 0;
        this.timeLeft = 60;
        this.board = [];
        this.resultOverlay.classList.remove('active');
        this.screen.classList.add('active');
        
        this.generateBoard();
        this.render();
        this.startTimer();
    }

    close() {
        this.stopTimer();
        this.screen.classList.remove('active');
        if (this.parent) this.parent.switchScreen('home');
    }

    generateBoard() {
        const totalTiles = this.rows * this.cols;
        const totalPairsNeeded = totalTiles / 2;
        let pool = [];

        // Fill pool with pairs
        for (let i = 0; i < totalPairsNeeded; i++) {
            const icon = this.icons[i % this.icons.length];
            pool.push(icon, icon);
        }

        // Shuffle pool
        pool.sort(() => Math.random() - 0.5);

        // Create 2D array (rows x cols)
        for (let r = 0; r < this.rows; r++) {
            this.board[r] = [];
            for (let c = 0; c < this.cols; c++) {
                this.board[r][c] = {
                    icon: pool.pop(),
                    visible: true
                };
            }
        }
        
        this.totalPairs = totalPairsNeeded;
        this.pairsCount.innerText = `0/${this.totalPairs}`;
    }

    startTimer() {
        this.stopTimer();
        this.timer = setInterval(() => {
            this.timeLeft -= 1;
            const percentage = (this.timeLeft / 60) * 100;
            this.timerBar.style.width = `${percentage}%`;

            if (this.timeLeft <= 0) {
                this.endGame(false);
            }
        }, 1000);
    }

    stopTimer() {
        if (this.timer) clearInterval(this.timer);
    }

    render() {
        this.boardEl.innerHTML = '';
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                const tile = this.board[r][c];
                const div = document.createElement('div');
                div.className = `onet-tile ${!tile.visible ? 'hidden' : ''}`;
                div.dataset.row = r;
                div.dataset.col = c;
                div.innerText = tile.icon;

                if (this.selectedTile && this.selectedTile.r === r && this.selectedTile.c === c) {
                    div.classList.add('selected');
                }

                div.addEventListener('click', () => this.handleTileClick(r, c));
                div.addEventListener('touchstart', (e) => {
                    e.preventDefault();
                    this.handleTileClick(r, c);
                });

                this.boardEl.appendChild(div);
            }
        }
    }

    handleTileClick(r, c) {
        if (this.isGameOver || !this.board[r][c].visible) return;

        if (!this.selectedTile) {
            this.selectedTile = { r, c };
            this.render();
            return;
        }

        // Clicked same tile -> deselect
        if (this.selectedTile.r === r && this.selectedTile.c === c) {
            this.selectedTile = null;
            this.render();
            return;
        }

        const tile1 = this.board[this.selectedTile.r][this.selectedTile.c];
        const tile2 = this.board[r][c];

        if (tile1.icon === tile2.icon) {
            const path = this.findPath(this.selectedTile.r, this.selectedTile.c, r, c);
            if (path) {
                this.connectTiles(this.selectedTile, { r, c }, path);
                this.selectedTile = null;
                return;
            }
        }

        // Not a match or no path -> switch selection
        this.selectedTile = { r, c };
        this.render();
    }

    connectTiles(p1, p2, path) {
        this.board[p1.r][p1.c].visible = false;
        this.board[p2.r][p2.c].visible = false;
        this.pairsFound++;
        this.pairsCount.innerText = `${this.pairsFound}/${this.totalPairs}`;

        this.drawConnection(path);
        
        setTimeout(() => {
            this.clearCanvas();
            this.render();
            if (this.pairsFound >= this.totalPairs) {
                this.endGame(true);
            } else if (!this.hasAvailableMoves()) {
                this.shuffleOnLock();
            }
        }, 300);
    }

    // Pathfinding: BFS to find path with max 2 turns (3 line segments)
    // For Onet, we can also use spaces *around* the board (padding)
    findPath(r1, c1, r2, c2) {
        // Simple Onet often allows moving outside the board
        // We'll simulate a virtal border of null tiles
        const dr = [-1, 1, 0, 0];
        const dc = [0, 0, -1, 1];
        
        let queue = [{ r: r1, c: c1, dir: -1, turns: 0, path: [{ r: r1, c: c1 }] }];
        let visited = new Map();

        while (queue.length > 0) {
            let current = queue.shift();

            if (current.r === r2 && current.c === c2) {
                return current.path;
            }

            for (let i = 0; i < 4; i++) {
                let nr = current.r + dr[i];
                let nc = current.c + dc[i];
                let nTurns = current.dir !== -1 && current.dir !== i ? current.turns + 1 : current.turns;

                if (nTurns > 2) continue;

                // Bounds check (-1 to rows, -1 to cols to allow outside board movement)
                if (nr >= -1 && nr <= this.rows && nc >= -1 && nc <= this.cols) {
                    // Check if tile is empty OR it is the target
                    const isEmpty = (nr < 0 || nr >= this.rows || nc < 0 || nc >= this.cols) || !this.board[nr][nc].visible;
                    const isTarget = (nr === r2 && nc === c2);

                    if (isEmpty || isTarget) {
                        let state = `${nr},${nc},${i},${nTurns}`;
                        if (!visited.has(state) || visited.get(state) > nTurns) {
                            visited.set(state, nTurns);
                            queue.push({
                                r: nr,
                                c: nc,
                                dir: i,
                                turns: nTurns,
                                path: [...current.path, { r: nr, c: nc }]
                            });
                        }
                    }
                }
            }
        }
        return null;
    }

    drawConnection(path) {
        this.clearCanvas();
        const rect = this.boardEl.getBoundingClientRect();
        const tileW = rect.width / this.cols;
        const tileH = rect.height / this.rows;

        this.ctx.beginPath();
        this.ctx.strokeStyle = '#007AFF';
        this.ctx.lineWidth = 4;
        this.ctx.lineJoin = 'round';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#007AFF';

        path.forEach((p, i) => {
            const x = p.c * tileW + tileW / 2;
            const y = p.r * tileH + tileH / 2;
            if (i === 0) this.ctx.moveTo(x, y);
            else this.ctx.lineTo(x, y);
        });
        this.ctx.stroke();
    }

    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    hasAvailableMoves() {
        for (let r1 = 0; r1 < this.rows; r1++) {
            for (let c1 = 0; c1 < this.cols; c1++) {
                if (!this.board[r1][c1].visible) continue;
                for (let r2 = 0; r2 < this.rows; r2++) {
                    for (let c2 = 0; c2 < this.cols; c2++) {
                        if (r1 === r2 && c1 === c2) continue;
                        if (!this.board[r2][c2].visible) continue;
                        if (this.board[r1][c1].icon === this.board[r2][c2].icon) {
                            if (this.findPath(r1, c1, r2, c2)) return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    shuffleOnLock() {
        const visibleTiles = [];
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].visible) visibleTiles.push(this.board[r][c].icon);
            }
        }
        
        visibleTiles.sort(() => Math.random() - 0.5);
        
        let i = 0;
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.board[r][c].visible) {
                    this.board[r][c].icon = visibleTiles[i++];
                }
            }
        }
        this.render();
        if (this.parent) this.parent.showToast("¡Tablero mezclado! 🔄");
    }

    showHint() {
        for (let r1 = 0; r1 < this.rows; r1++) {
            for (let c1 = 0; c1 < this.cols; c1++) {
                if (!this.board[r1][c1].visible) continue;
                for (let r2 = 0; r2 < this.rows; r2++) {
                    for (let c2 = 0; c2 < this.cols; c2++) {
                        if (r1 === r2 && c1 === c2) continue;
                        if (!this.board[r2][c2].visible) continue;
                        if (this.board[r1][c1].icon === this.board[r2][c2].icon) {
                            if (this.findPath(r1, c1, r2, c2)) {
                                // Highlight both
                                this.selectedTile = { r: r1, c: c1 };
                                this.render();
                                return;
                            }
                        }
                    }
                }
            }
        }
    }

    endGame(isWin) {
        this.isGameOver = true;
        this.stopTimer();
        this.resultOverlay.classList.add('active');
        
        if (isWin) {
            this.resultTitle.innerText = "¡Objetivo conseguido!";
            this.resultText.innerText = "Has ganado 1 Vida ❤️";
            if (this.parent) {
                this.parent.stats.lives = (this.parent.stats.lives || 1) + 1;
                this.parent.saveStats();
                this.parent.shootConfetti();
            }
        } else {
            this.resultTitle.innerText = "¡Tiempo agotado!";
            this.resultText.innerText = "Inténtalo de nuevo más tarde ⌛";
        }
    }
}

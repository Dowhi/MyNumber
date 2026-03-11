/**
 * MYNUMBER (STARTER EDITION)
 * Management of Views, Ranking, Phase Refills, and Hints with Connections.
 */

const GRID_COLS = 9;
const INITIAL_TARGET_CELLS = 35;
const VISIBLE_ROWS = 12; 
const TOTAL_CELL_SCREEN = GRID_COLS * VISIBLE_ROWS;

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
        
        // Load Scores
        this.allTimeHighScore = parseInt(localStorage.getItem('myNumberHighScore')) || 0;
        this.dailyHighScore = parseInt(localStorage.getItem('myNumberDailyHighScore')) || 0;
        this.ranking = JSON.parse(localStorage.getItem('myNumberRanking')) || [];
        
        this.checkDailyReset();

        this.fase = 1;
        this.addCount = 5;
        this.hintCount = 5; 

        this.initDOM();
        this.initBoard();
        this.render();
        
        window.GAME = this;
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
    }

    switchScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.getElementById(`${screenId}-screen`).classList.add('active');
        if (screenId === 'home') this.homeHS.innerText = this.formatScore(this.allTimeHighScore);
        if (screenId === 'ranking') this.renderRanking();
    }

    startNewGame() {
        this.board = [];
        this.score = 0;
        this.visualScore = 0;
        this.fase = 1;
        this.addCount = 5;
        this.hintCount = 5;
        this.selectedIndices = [];
        this.gameOverOverlay.classList.remove('active');
        this.initBoard();
        this.switchScreen('game');
        this.render();
    }

    initBoard() {
        this.board = [];
        const guaranteed = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        const others = [];
        for (let i = 0; i < (INITIAL_TARGET_CELLS - guaranteed.length); i++) {
            others.push(Math.floor(Math.random() * 9) + 1);
        }
        const fullSet = [...guaranteed, ...others].sort(() => Math.random() - 0.5);
        fullSet.forEach(val => this.board.push({ value: val, state: STATE.ACTIVE }));
    }

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

        let activeBetween = 0;
        let gaps = false;
        for (let i = start + 1; i < end; i++) {
            if (this.board[i].state === STATE.ACTIVE) activeBetween++;
            else gaps = true;
        }

        if (activeBetween === 0) {
            const diff = end - start;
            if (diff === 1) {
                if (start % GRID_COLS === GRID_COLS - 1) return { matchable: true, type: gaps ? 4 : 2 };
                return { matchable: true, type: gaps ? 4 : 1 };
            }
            return { matchable: true, type: 4 };
        }

        if (col1 === col2) {
            let blocked = false; let gap = false;
            for (let r = Math.min(row1, row2) + 1; r < Math.max(row1, row2); r++) {
                if (this.board[r * GRID_COLS + col1].state === STATE.ACTIVE) { blocked = true; break; }
                else gap = true;
            }
            if (!blocked) return { matchable: true, type: (Math.abs(row1-row2) === 1 && !gap) ? 1 : 4 };
        }

        if (Math.abs(row1 - row2) === Math.abs(col1 - col2)) {
            let blocked = false; let gap = false;
            const rStep = row2 > row1 ? 1 : -1; const cStep = col2 > col1 ? 1 : -1;
            let currR = row1 + rStep; let currC = col1 + cStep;
            while (currR !== row2) {
                if (this.board[currR * GRID_COLS + currC].state === STATE.ACTIVE) { blocked = true; break; }
                else gap = true;
                currR += rStep; currC += cStep;
            }
            if (!blocked) return { matchable: true, type: (Math.abs(row1-row2) === 1 && !gap) ? 1 : 4 };
        }

        return { matchable: false };
    }

    executeMatch(idx1, idx2, basePoints) {
        const points = basePoints * this.fase;
        this.board[idx1].state = STATE.NULL;
        this.board[idx2].state = STATE.NULL;
        this.selectedIndices = [];
        this.score += points;
        
        // Trigger visual animation
        this.animatePoints(idx1, idx2, points);

        this.checkRowClear();
        if (this.board.every(c => c.state === STATE.NULL)) this.handlePhaseAdvance();
        else this.checkGameOver();
        this.updateHighScores();
        this.render();
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
        
        label.style.left = `${centerX}px`;
        label.style.top = `${centerY}px`;
        document.body.appendChild(label);

        // 2. Trajectory towards the goal (after a small pause for pop animation)
        setTimeout(() => {
            const destX = scoreTarget.left + scoreTarget.width / 2;
            const destY = scoreTarget.top + scoreTarget.height / 2;

            label.style.transform = `translate(${destX - centerX}px, ${destY - centerY}px) scale(0.5)`;
            label.style.opacity = '0';

            // 3. Impact and Score Update
            setTimeout(() => {
                document.body.removeChild(label);
                this.triggerScoreImpact();
            }, 600);
        }, 300);
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
        this.score += 150 * this.fase;
        this.fase++;
        this.hintCount = 5;
        this.addCount = 5;
        this.initBoard();
        this.render();
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

    checkRowClear() {
        let rowsToRemove = [];
        for (let r = 0; r < Math.ceil(this.board.length / GRID_COLS); r++) {
            const row = this.board.slice(r * GRID_COLS, (r + 1) * GRID_COLS);
            if (row.length === GRID_COLS && row.every(c => c.state === STATE.NULL)) rowsToRemove.push(r);
        }
        for (let i = rowsToRemove.length - 1; i >= 0; i--) {
            this.board.splice(rowsToRemove[i] * GRID_COLS, GRID_COLS);
            this.score += 10 * this.fase;
        }
    }

    addNumbers() {
        if (this.addCount <= 0) return;
        const actives = this.board.filter(c => c.state === STATE.ACTIVE).map(c => ({ value: c.value, state: STATE.ACTIVE }));
        if (actives.length > 0) {
            this.board = [...this.board, ...actives];
            this.addCount--;
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
            this.saveToRanking();
            this.finalScoreElement.innerText = this.score;
            this.gameOverOverlay.classList.add('active');
        }
    }

    saveToRanking() {
        const entry = { score: this.score, date: new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }) };
        this.ranking.push(entry);
        this.ranking.sort((a, b) => b.score - a.score);
        this.ranking = this.ranking.slice(0, 10);
        localStorage.setItem('myNumberRanking', JSON.stringify(this.ranking));
    }

    renderRanking() {
        const list = document.getElementById('ranking-list');
        if (!list) return;
        list.innerHTML = '';
        
        // Add sample data if empty for first-time users to see the style
        if (this.ranking.length === 0) {
            this.ranking = [
                { score: 5587, date: '11 mar' },
                { score: 3178, date: '10 mar' },
                { score: 1916, date: '09 mar' }
            ];
        }

        this.ranking.forEach((entry, idx) => {
            const div = document.createElement('div');
            div.className = 'rank-item';
            div.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <span class="rank-num">#${idx+1}</span>
                    <div class="rank-info">
                        <span class="rank-score">${this.formatScore(entry.score)}</span>
                        <span class="rank-date">${entry.date}</span>
                    </div>
                </div>
                <span class="rank-medal">🏆</span>
            `;
            list.appendChild(div);
        });
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
                    this.render();
                    return;
                }
            }
        }
        alert("¡No hay parejas posibles!");
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
            if (this.selectedIndices.includes(index)) { div.style.background = "#007aff"; div.style.color = "white"; div.style.borderRadius = "4px"; }
            
            div.innerText = cell.value;
            div.addEventListener('click', () => {
                if (cell.state !== STATE.ACTIVE) return;
                if (this.selectedIndices.includes(index)) this.selectedIndices = [];
                else if (this.selectedIndices.length === 0) this.selectedIndices.push(index);
                else {
                    const info = this.getMatchInfo(this.selectedIndices[0], index);
                    if (info.matchable) this.executeMatch(this.selectedIndices[0], index, info.type);
                    else this.selectedIndices = [index];
                }
                this.render();
            });
            this.gridElement.appendChild(div);
        });

        for (let i = this.board.length; i < TOTAL_CELL_SCREEN; i++) {
            this.gridElement.appendChild(document.createElement('div')).className = 'grid-cell';
        }
    }
}

window.onload = () => new MyNumberGame();

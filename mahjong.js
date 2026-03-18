/**
 * Mahjong Mystic Edition - V58 - "The Brick Update"
 * Implementación de Match-2 con Estética 3D y Partículas.
 */

class MahjongModel {
    constructor() {
        this.fichas = [];
        this.score = 0;
    }

    cargarNivel(datos) {
        this.fichas = datos.map(f => ({
            ...f,
            estado_visibilidad: true
        }));
    }

    obtenerFichasActivas() {
        return this.fichas.filter(f => f.estado_visibilidad);
    }

    // Lógica de Bloqueo Pro: Bloqueo Superior + Bloqueo Lateral (Clásico Mahjong)
    esLibre(ficha) {
        if (!ficha.estado_visibilidad) return false;
        const activas = this.obtenerFichasActivas();

        let isBlockedOnTop = false;
        let isBlockedLeft = false;
        let isBlockedRight = false;

        for (const s of activas) {
            if (s.id_unico === ficha.id_unico) continue;

            const xOverlap = s.coord_X < ficha.coord_X + 2 && s.coord_X + 2 > ficha.coord_X;
            const yOverlap = s.coord_Y < ficha.coord_Y + 2 && s.coord_Y + 2 > ficha.coord_Y;

            // Bloqueo Superior: Alguna ficha solapa en una capa superior
            if (s.coord_Z > ficha.coord_Z && xOverlap && yOverlap) {
                isBlockedOnTop = true;
            }

            // Bloqueo Lateral: Fichas en la misma capa a la izquierda O derecha
            if (s.coord_Z === ficha.coord_Z && yOverlap) {
                if (s.coord_X === ficha.coord_X - 2) isBlockedLeft = true;
                if (s.coord_X === ficha.coord_X + 2) isBlockedRight = true;
            }
        }

        // Una ficha no es libre si tiene otra encima, O si tiene fichas a AMBOS lados simultáneamente (Mahjong Clásico)
        return !isBlockedOnTop && !(isBlockedLeft && isBlockedRight);
    }
}

class MahjongView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.slotBar = document.getElementById('mj-slot-bar');
        this.innerBoard = null;
        this.initInnerBoard();
        this.particleContainer = null;
        this.initParticles();
    }

    initInnerBoard() {
        if (!this.container) return;
        this.innerBoard = document.createElement('div');
        this.innerBoard.id = 'mj-inner-board';
        this.innerBoard.style.position = 'relative';
        this.innerBoard.style.width = '405px'; // 5 fichas * 81px
        this.innerBoard.style.height = '630px'; // 7 fichas * 90px
        this.innerBoard.style.pointerEvents = 'none';
        this.innerBoard.style.marginTop = '10px';
        this.innerBoard.style.marginLeft = 'auto';
        this.innerBoard.style.marginRight = 'auto';
        this.innerBoard.style.transformOrigin = 'top center';
        this.container.appendChild(this.innerBoard);

        // Responsive scaler so it never overflows or uncenters
        const resizeBoard = () => {
            if (!this.innerBoard || !this.container) return;
            // Get available space
            const slotBarEl = document.getElementById('mj-slot-bar-container');
            const slotH = slotBarEl ? slotBarEl.offsetHeight : 80;
            const availableW = this.container.clientWidth;
            const availableH = this.container.clientHeight - slotH;

            // Calculate best scale to fit entirely within the available space
            const baseW = 408;
            const baseH = 630;

            // Margins: 10px on sides, 10px above/below
            const scaleW = (availableW - 20) / baseW;
            const scaleH = (availableH - 20) / baseH;

            // Escalar para que encaje 100% en AMBAS direcciones (ancho y alto)
            const scale = Math.min(1.4, scaleW, scaleH);

            this.innerBoard.style.transform = `scale(${scale})`;

            // Centrado vertical dinámico: el usuario quiere reducir el hueco superior a la mitad de lo que había (era /4)
            const visualH = baseH * scale;
            const offsetH = Math.max(0, (availableH - visualH) / 8); // Cambiado a /8 para pegar aún más el bloque arriba



            this.innerBoard.style.marginTop = `${offsetH}px`;
            this.innerBoard.style.marginBottom = `-${baseH - visualH}px`;
        };

        window.addEventListener('resize', resizeBoard);
        setTimeout(resizeBoard, 10);
    }

    initParticles() {
        this.particleContainer = document.createElement('div');
        this.particleContainer.id = 'mj-particles';
        document.body.appendChild(this.particleContainer);
    }

    renderTablero(fichas, model, clickHandler) {
        if (!this.innerBoard) return;
        this.innerBoard.innerHTML = '';

        // Layout clásico Mahjong: fichas contiguas sin espacios
        // Cada ficha mide 81px ancho x 90px alto
        // Coordenadas: 2 unidades por ficha en X, 1 unidad en Y
        const unitW = 40.5; // Mitad del ancho de ficha (81px / 2)
        const unitH = 45;   // Mitad del alto de ficha para solapamiento (90px / 2)

        fichas.forEach(f => {
            if (!f.estado_visibilidad) return;
            const isFree = model.esLibre(f);

            const div = document.createElement('div');
            div.className = `mahjong-tile ${isFree ? '' : 'blocked'}`;
            div.id = `mj-tile-${f.id_unico}`;
            div.style.zIndex = f.coord_Z * 100 + f.coord_Y * 10 + f.coord_X;
            div.style.left = `${f.coord_X * unitW}px`;
            div.style.top = `${f.coord_Y * unitH}px`;
            div.style.pointerEvents = 'auto';
            if (f.faceDown) {
                div.classList.add('face-down');
            }

            const face = document.createElement('div');
            face.className = 'tile-face';
            const img = document.createElement('img');
            img.src = window.IMAGE_MAP[f.tipo_simbologia] || "assets/mahjong/tiles/eagle.png";
            face.appendChild(img);
            div.appendChild(face);

            div.onclick = () => clickHandler(f, div);
            this.innerBoard.appendChild(div);
        });
        this.scaleInnerBoard();
    }

    scaleInnerBoard() {
        const ctrWidth = window.innerWidth;
        const ctrHeight = window.innerHeight;
        const scaleX = (ctrWidth - 20) / 400;
        const scaleY = (ctrHeight - 200) / 600;
        let scale = Math.min(scaleX, scaleY) * 0.9;
        this.innerBoard.style.transform = `translate(-50%, -50%) scale(${scale})`;
        this.innerBoard.style.left = '50%';
        this.innerBoard.style.top = '66%';
    }

    // Animación de Vuelo Parabólica (V58)
    animateToSlot(ficha, slotEl, onComplete) {
        const div = document.getElementById(`mj-tile-${ficha.id_unico}`);
        if (!div || !slotEl) return;

        const startRect = div.getBoundingClientRect();
        const endRect = slotEl.getBoundingClientRect();

        const duration = 400; // 400ms avg
        const startTime = performance.now();

        const startX = startRect.left;
        const startY = startRect.top;
        const endX = endRect.left;
        const endY = endRect.top;

        // Clone for animation to avoid layout issues
        const ghost = div.cloneNode(true);
        ghost.style.position = 'fixed';
        ghost.style.left = `${startX}px`;
        ghost.style.top = `${startY}px`;
        ghost.style.zIndex = 10000;
        ghost.style.margin = '0';
        ghost.style.transition = 'none';
        document.body.appendChild(ghost);
        div.style.visibility = 'hidden';

        const step = (now) => {
            const progress = Math.min(1, (now - startTime) / duration);
            const ease = progress * (2 - progress); // easeOutQuad

            const curX = startX + (endX - startX) * progress;
            const curY = startY + (endY - startY) * progress;

            // Parabola: subida de 100px en el medio
            const parabola = Math.sin(progress * Math.PI) * 100;

            // Ligera rotación en Z para dar sensación de ligereza al volar (requisito)
            const rotationZ = Math.sin(progress * Math.PI) * 15; // Hasta 15 grados

            ghost.style.left = `${curX}px`;
            ghost.style.top = `${curY - parabola}px`;
            ghost.style.transform = `scale(${1 - progress * 0.4}) rotate(${progress * 360}deg) rotateZ(${rotationZ}deg)`;

            if (progress < 1) {
                requestAnimationFrame(step);
            } else {
                document.body.removeChild(ghost);
                onComplete();
            }
        };
        requestAnimationFrame(step);
    }

    spawnParticles(x, y) {
        // "Explosión de partículas blancas y verdes (pétalos)"
        const colors = ['#ffffff', '#224d17', '#80e27e'];

        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'particle';

            p.style.left = `${x}px`;
            p.style.top = `${y}px`;

            // Pétalo style
            p.style.width = `${5 + Math.random() * 5}px`;
            p.style.height = `${8 + Math.random() * 8}px`;
            p.style.background = colors[Math.floor(Math.random() * colors.length)];
            p.style.borderRadius = '50% 0 50% 0'; // Forma de hoja/pétalo

            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 5;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            const rotSpeed = (Math.random() - 0.5) * 20;

            this.particleContainer.appendChild(p);

            let curX = x;
            let curY = y;
            let opa = 1;
            let rot = 0;

            const move = () => {
                curX += vx;
                curY += vy + 1; // Slight gravity
                opa -= 0.02;
                rot += rotSpeed;

                p.style.transform = `translate(${curX - x}px, ${curY - y}px) rotate(${rot}deg)`;
                p.style.opacity = opa;

                if (opa > 0) requestAnimationFrame(move);
                else p.remove();
            };
            requestAnimationFrame(move);
        }
    }
}

class MahjongController {
    constructor(view) {
        this.view = view;
        this.model = new MahjongModel();
        this.slots = [];
        this.maxSlots = 4; // Vuelto a 4 como solicitado por el usuario
        this.score = 0;
        this.enPartida = false;
        this.lastFlippedTile = null; // Track last flipped face-down tile
        this.timerInterval = null;
        this.startTime = null;

        window.IMAGE_MAP = {
            "Eagle": "assets/mahjong/stickers/sticker_style_eagle_1773775041566.png",
            "Lynx": "assets/mahjong/stickers/sticker_style_lynx_v2_1773775169836.png",
            "Frog": "assets/mahjong/stickers/sticker_style_frog_dart_1773775056256.png",
            "Squirrel": "assets/mahjong/stickers/sticker_style_squirrel_v2_1773775186632.png",
            "Deer": "assets/mahjong/stickers/sticker_style_deer_v2_1773775201032.png",
            "Snake": "assets/mahjong/stickers/sticker_style_snake_v2_1773775220214.png",
            "Hedgehog": "assets/mahjong/stickers/sticker_style_hedgehog_v2_1773775237041.png",
            "Badger": "assets/mahjong/stickers/sticker_style_badger_v2_1773775251390.png",
            "Stag": "assets/mahjong/stickers/sticker_style_stag_v2_1773775346858.png",
            "Barn Owl": "assets/mahjong/stickers/sticker_style_lechuza_v2_1773775269698.png",
            "Hamster": "assets/mahjong/stickers/sticker_style_hamster_v2_1773775283399.png",
            "Dormouse": "assets/mahjong/stickers/sticker_style_liron_v2_1773775297682.png",
            "Owl": "assets/mahjong/stickers/sticker_style_owl_v2_1773775331463.png",
            "Wild Boar": "assets/mahjong/stickers/sticker_style_jabal_v2_1773775316526.png",
            "Toucan": "assets/mahjong/stickers/sticker_style_toucan_1773775070529.png"
        };
    }

    iniciarJuego() {
        console.log("MAHJONG V61: Random Layout, 4 Slots, Face-Down mechanics");
        const layout = window.generarLayoutMahjong();
        this.model.cargarNivel(layout);
        this.slots = [];
        this.score = 0;
        this.enPartida = true;
        this.startTime = Date.now();
        this.startTimer();
        this.render();
        this.updateUI();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
            const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
            const secs = (elapsed % 60).toString().padStart(2, '0');
            const timerEl = document.getElementById('mj-timer');
            if (timerEl) timerEl.textContent = `${mins}:${secs}`;
        }, 1000);
    }

    stopTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    }

    render() {
        this.view.renderTablero(this.model.fichas, this.model, (f, div) => this.handleTileClick(f, div));
    }

    handleTileClick(ficha, div) {
        if (!this.enPartida || this.slots.length >= this.maxSlots) return;

        // Fichas bloqueadas vibran, pero no pueden cogerse
        if (!this.model.esLibre(ficha)) {
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 400);
            return;
        }

        // Si es libre y está boca abajo, simplemente se voltea y no se juega
        if (ficha.faceDown) {
            // Voltear la última ficha volteada (si existe) de nuevo boca abajo
            if (this.lastFlippedTile && this.lastFlippedTile.ficha !== ficha) {
                this.lastFlippedTile.ficha.faceDown = true;
                this.lastFlippedTile.div.classList.add('face-down');
                this.lastFlippedTile.div.style.transform = 'scale(1.1) rotateY(180deg)';
                this.lastFlippedTile.div.style.transition = 'transform 0.4s';
                setTimeout(() => {
                    this.lastFlippedTile.div.style.transform = '';
                    this.lastFlippedTile.div.style.transition = '';
                }, 400);
            }

            // Voltear la nueva ficha boca arriba
            ficha.faceDown = false;
            div.classList.remove('face-down');
            // Feedback
            div.style.transform = 'scale(1.1) rotateY(180deg)';
            div.style.transition = 'transform 0.4s';
            setTimeout(() => { div.style.transform = ''; div.style.transition = ''; }, 400);

            // Guardar referencia a la última ficha volteada
            this.lastFlippedTile = { ficha, div };
            return;
        }

        // Ficha libre pulsada: VIBRACIÓN sutil ("Feedback Visual: Selección")
        div.style.transform = 'scale(0.9)';
        setTimeout(() => div.style.transform = '', 100);

        // Move to slots
        const slotEl = this.view.slotBar.children[this.slots.length];
        this.slots.push(ficha);
        ficha.estado_visibilidad = false;

        this.view.animateToSlot(ficha, slotEl, () => {
            this.refreshSlotsUI();
            this.checkMatches();
        });
    }

    refreshSlotsUI() {
        Array.from(this.view.slotBar.children).forEach((el, i) => {
            el.innerHTML = '';
            if (this.slots[i]) {
                const div = document.createElement('div');
                div.className = 'mahjong-tile in-slot';

                const face = document.createElement('div');
                face.className = 'tile-face';

                const img = document.createElement('img');
                img.src = window.IMAGE_MAP[this.slots[i].tipo_simbologia];
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.draggable = false;

                face.appendChild(img);
                div.appendChild(face);
                el.appendChild(div);
            }
        });
    }

    checkMatches() {
        if (this.slots.length < 2) return;

        // Match 2 Logic
        for (let i = 0; i < this.slots.length; i++) {
            for (let j = i + 1; j < this.slots.length; j++) {
                if (this.slots[i].tipo_simbologia === this.slots[j].tipo_simbologia) {
                    // MATCH!
                    const matchX = this.view.slotBar.getBoundingClientRect().left + 150;
                    const matchY = this.view.slotBar.getBoundingClientRect().top;
                    this.view.spawnParticles(matchX, matchY);

                    const f1 = this.slots[i];
                    const f2 = this.slots[j];
                    this.slots = this.slots.filter(s => s !== f1 && s !== f2);

                    this.score += 500;
                    this.updateUI();
                    setTimeout(() => this.refreshSlotsUI(), 300);

                    // Check win condition
                    this.checkWinCondition();
                    return;
                }
            }
        }

        if (this.slots.length >= this.maxSlots) {
            // "Feedback Visual (Error): Si la bandeja se llena, las fichas tiemblan en color rojo antes del Game Over"
            this.enPartida = false;
            const bgOriginals = [];

            Array.from(this.view.slotBar.children).forEach(el => {
                el.classList.add('shake');
                const img = el.querySelector('img');
                if (img) {
                    img.style.filter = 'drop-shadow(0 0 5px red) brightness(0.7) sepia(1) hue-rotate(-50deg) saturate(3)';
                }
            });

            setTimeout(() => {
                window.GAME.showToast("¡Bandeja llena! Fin del juego.");
                // Reset game over UI if needed, or rely on reload
            }, 800);
        }
    }

    checkWinCondition() {
        const activas = this.model.obtenerFichasActivas();
        if (activas.length === 0 && this.slots.length === 0) {
            // Victoria!
            this.stopTimer();
            this.showConfetti();
            this.addLifeToMainGame();
            setTimeout(() => {
                window.GAME.showToast("¡Victoria! +1 Vida ❤️");
            }, 500);
        }
    }

    showConfetti() {
        const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#ffa500', '#ff69b4'];

        for (let i = 0; i < 150; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = `${8 + Math.random() * 8}px`;
            confetti.style.height = `${8 + Math.random() * 8}px`;
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.top = '-20px';
            confetti.style.zIndex = '99999';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;

            document.body.appendChild(confetti);

            const fallDuration = 2000 + Math.random() * 2000;
            const fallDelay = Math.random() * 500;

            setTimeout(() => {
                confetti.style.transition = `top ${fallDuration}ms ease-in, transform ${fallDuration}ms linear`;
                confetti.style.top = '110vh';
                confetti.style.transform = `rotate(${720 + Math.random() * 360}deg)`;

                setTimeout(() => confetti.remove(), fallDuration + fallDelay);
            }, fallDelay);
        }
    }

    addLifeToMainGame() {
        if (window.GAME && window.GAME.stats) {
            window.GAME.stats.lives = (window.GAME.stats.lives || 0) + 1;
            window.GAME.saveStats();
            window.GAME.updateHeader();
        }
    }

    updateUI() {
        const scoreEl = document.getElementById('mj-score');
        if (scoreEl) scoreEl.textContent = this.score.toLocaleString();
    }

    hint() {
        const activas = this.model.obtenerFichasActivas().filter(f => this.model.esLibre(f));
        const pairs = {};
        activas.forEach(f => {
            pairs[f.tipo_simbologia] = pairs[f.tipo_simbologia] || [];
            pairs[f.tipo_simbologia].push(f);
        });
        for (let t in pairs) {
            if (pairs[t].length >= 2) {
                pairs[t].slice(0, 2).forEach((f, idx) => {
                    setTimeout(() => {
                        const div = document.getElementById(`mj-tile-${f.id_unico}`);
                        if (div) this.handleTileClick(f, div);
                    }, idx * 400);
                });
                return;
            }
        }
    }

    shuffle() {
        const activas = this.model.obtenerFichasActivas();
        const pos = activas.map(f => ({ x: f.coord_X, y: f.coord_Y, z: f.coord_Z }));
        for (let i = pos.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pos[i], pos[j]] = [pos[j], pos[i]];
        }
        activas.forEach((f, i) => {
            f.coord_X = pos[i].x; f.coord_Y = pos[i].y; f.coord_Z = pos[i].z;
        });
        this.render();
    }
}

// Generador de Niveles Aleatorios - Layout 5 columnas x 7 filas
function generarLayoutMahjong() {
    const layout = [];
    const tipos = ["Eagle", "Lynx", "Frog", "Squirrel", "Deer", "Snake", "Hedgehog", "Badger", "Stag", "Barn Owl", "Hamster", "Dormouse", "Owl", "Wild Boar", "Toucan"];
    let pool = [];

    // Generaremos 30 pares = 60 fichas para layout 5x7 + capas aleatorias
    for (let i = 0; i < 30; i++) {
        const t = tipos[Math.floor(Math.random() * tipos.length)];
        pool.push(t, t);
    }

    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let id = 1;
    const add = (x, y, z) => {
        if (!pool.length) return;
        const isFaceDown = Math.random() < 0.2;
        layout.push({
            id_unico: id++,
            tipo_simbologia: pool.pop(),
            coord_X: x,
            coord_Y: y,
            coord_Z: z,
            faceDown: isFaceDown
        });
    };

    // CAPA 0: Base completa 5x7 (35 fichas)
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
            add(col * 2, row * 2, 0);
        }
    }

    // CAPA 1: 20 fichas aleatorias sobre la base
    const positionsZ1 = [];
    for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 5; col++) {
            positionsZ1.push({ row, col });
        }
    }
    // Shuffle posiciones
    for (let i = positionsZ1.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positionsZ1[i], positionsZ1[j]] = [positionsZ1[j], positionsZ1[i]];
    }
    // Colocar 20 fichas en posiciones aleatorias
    for (let i = 0; i < 20 && i < positionsZ1.length; i++) {
        add(positionsZ1[i].col * 2, positionsZ1[i].row * 2, 1);
    }

    // CAPA 2: 5 fichas aleatorias en la cima
    const positionsZ2 = [];
    for (let row = 1; row < 6; row++) {
        for (let col = 1; col < 4; col++) {
            positionsZ2.push({ row, col });
        }
    }
    // Shuffle posiciones
    for (let i = positionsZ2.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positionsZ2[i], positionsZ2[j]] = [positionsZ2[j], positionsZ2[i]];
    }
    // Colocar 5 fichas en posiciones aleatorias
    for (let i = 0; i < 5 && i < positionsZ2.length; i++) {
        add(positionsZ2[i].col * 2, positionsZ2[i].row * 2, 2);
    }

    return layout;
}

window.MahjongController = MahjongController;
window.MahjongView = MahjongView;
window.generarLayoutMahjong = generarLayoutMahjong;

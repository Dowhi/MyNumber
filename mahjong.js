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

    // Lógica de Bloqueo Pro: Cualquier píxel de capa superior bloquea
    esLibre(ficha) {
        if (!ficha.estado_visibilidad) return false;
        const activas = this.obtenerFichasActivas();
        
        return !activas.some(s => {
            if (s.coord_Z <= ficha.coord_Z) return false;
            // Detección de solapamiento 2x2 unidades (huella de la ficha)
            return (s.coord_X < ficha.coord_X + 2 && s.coord_X + 2 > ficha.coord_X &&
                    s.coord_Y < ficha.coord_Y + 2 && s.coord_Y + 2 > ficha.coord_Y);
        });
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
        this.innerBoard.style.position = 'absolute';
        this.innerBoard.style.width = '400px'; 
        this.innerBoard.style.height = '600px';
        this.innerBoard.style.pointerEvents = 'none';
        this.container.appendChild(this.innerBoard);
    }

    initParticles() {
        this.particleContainer = document.createElement('div');
        this.particleContainer.id = 'mj-particles';
        document.body.appendChild(this.particleContainer);
    }

    renderTablero(fichas, model, clickHandler) {
        if (!this.innerBoard) return;
        this.innerBoard.innerHTML = '';
        
        const unitW = 32;
        const unitH = 42;

        fichas.forEach(f => {
            if (!f.estado_visibilidad) return;
            const isFree = model.esLibre(f);
            
            const div = document.createElement('div');
            div.className = `mahjong-tile ${isFree ? '' : 'blocked'}`;
            div.id = `mj-tile-${f.id_unico}`;
            div.style.zIndex = f.coord_Z * 100 + f.coord_Y * 10 + f.coord_X;
            div.style.left = `${f.coord_X * unitW}px`;
            div.style.top = `${f.coord_Y * unitH}px`;
            div.style.pointerEvents = 'auto'; // Ensure clickable
            
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
            
            ghost.style.left = `${curX}px`;
            ghost.style.top = `${curY - parabola}px`;
            ghost.style.transform = `scale(${1 - progress * 0.4}) rotate(${progress * 360}deg)`;
            
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
        for (let i = 0; i < 15; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = `${x}px`;
            p.style.top = `${y}px`;
            const angle = Math.random() * Math.PI * 2;
            const velocity = 2 + Math.random() * 5;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            this.particleContainer.appendChild(p);
            
            let curX = x;
            let curY = y;
            let opa = 1;
            
            const move = () => {
                curX += vx;
                curY += vy;
                opa -= 0.02;
                p.style.left = `${curX}px`;
                p.style.top = `${curY}px`;
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
        this.maxSlots = 4; // Solicitado: "los huecos son solo cuatro"
        this.score = 0;
        this.enPartida = false;
        
        window.IMAGE_MAP = {
            "Eagle": "assets/mahjong/tiles/eagle.png",
            "Lynx": "assets/mahjong/tiles/lynx.png",
            "Frog": "assets/mahjong/tiles/frog.png",
            "Squirrel": "assets/mahjong/tiles/squirrel.png",
            "Deer": "assets/mahjong/tiles/deer.png",
            "Snake": "assets/mahjong/tiles/snake.png",
            "Hedgehog": "assets/mahjong/tiles/hedgehog.png",
            "Badger": "assets/mahjong/tiles/badger.png",
            "Stag": "assets/mahjong/tiles/stag.png",
            "Barn Owl": "assets/mahjong/tiles/barn_owl.png",
            "Hamster": "assets/mahjong/tiles/hamster.png",
            "Dormouse": "assets/mahjong/tiles/dormouse.png",
            "Owl": "assets/mahjong/tiles/owl.png",
            "Wild Boar": "assets/mahjong/tiles/wild_boar.png"
        };
    }

    iniciarJuego() {
        console.log("MAHJONG V59: Interactivity Fix & Fallback BG");
        const layout = window.generarLayoutMahjong();
        this.model.cargarNivel(layout);
        this.slots = [];
        this.score = 0;
        this.enPartida = true;
        this.render();
        this.updateUI();
    }

    render() {
        this.view.renderTablero(this.model.fichas, this.model, (f, div) => this.handleTileClick(f, div));
    }

    handleTileClick(ficha, div) {
        if (!this.enPartida || this.slots.length >= this.maxSlots) return;
        if (!this.model.esLibre(ficha)) {
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 400);
            return;
        }

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
                const img = document.createElement('img');
                img.src = window.IMAGE_MAP[this.slots[i].tipo_simbologia];
                img.style.width = '80%';
                el.appendChild(img);
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
                    return;
                }
            }
        }

        if (this.slots.length >= this.maxSlots) {
            window.GAME.showToast("¡Bandeja llena! Fin del juego.");
            this.enPartida = false;
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
        const pos = activas.map(f => ({x: f.coord_X, y: f.coord_Y, z: f.coord_Z}));
        for(let i=pos.length-1; i>0; i--) {
            const j = Math.floor(Math.random() * (i+1));
            [pos[i], pos[j]] = [pos[j], pos[i]];
        }
        activas.forEach((f, i) => {
            f.coord_X = pos[i].x; f.coord_Y = pos[i].y; f.coord_Z = pos[i].z;
        });
        this.render();
    }
}

// Generador de Niveles (Múltiplos de 2 ahora para Match-2)
function generarLayoutMahjong() {
    const layout = [];
    const tipos = ["Eagle", "Lynx", "Frog", "Squirrel", "Deer", "Snake", "Hedgehog", "Badger", "Stag", "Barn Owl", "Hamster", "Dormouse", "Owl", "Wild Boar"];
    let pool = [];
    for(let i=0; i<50; i++) {
        const t = tipos[Math.floor(Math.random()*tipos.length)];
        pool.push(t, t); // Pares
    }
    // Shuffle pool
    for(let i=pool.length-1; i>0; i--) {
        const j = Math.floor(Math.random()*(i+1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    let id = 1;
    const add = (x, y, z) => {
        if (!pool.length) return;
        layout.push({ id_unico: id++, tipo_simbologia: pool.pop(), coord_X: x, coord_Y: y, coord_Z: z });
    };

    // Pyramidal Layout restyled for V58
    for(let z=0; z<4; z++) {
        const size = 6 - z;
        const offset = z;
        for(let r=0; r<size; r++) {
            for(let c=0; c<size; c++) {
                add(c*2 + offset, r*2 + offset, z);
            }
        }
    }
    return layout;
}

window.MahjongController = MahjongController;
window.MahjongView = MahjongView;
window.generarLayoutMahjong = generarLayoutMahjong;

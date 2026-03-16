/**
 * Especificación Técnica: Motor Lógico y Modelado de Datos de Mahjong Solitario
 * Implementación en JavaScript del patrón MVC.
 */

// 1. Modelado de Datos: La Entidad "Ficha"
class FichaMahjong {
    constructor(id_unico, tipo_simbologia, valor_puntos, coord_X, coord_Y, coord_Z, color = null) {
        this.id_unico = id_unico;
        this.tipo_simbologia = tipo_simbologia;
        this.valor_puntos = valor_puntos;
        this.coord_X = coord_X;
        this.coord_Y = coord_Y;
        this.coord_Z = coord_Z;
        this.estado_visibilidad = true;
        this.color = color; 
        this.flipped = false; 
    }
}

// 2. Motor Lógico (El Corazón del Modelo)
class MahjongModel {
    constructor() {
        this.fichas = [];
        this.puntuacion_global = 0;
    }

    cargarNivel(datosFichas) {
        this.fichas = datosFichas.map(f => 
            new FichaMahjong(f.id, f.tipo, f.valor, f.x, f.y, f.z, f.color)
        );
        this.puntuacion_global = 0;
    }

    obtenerFichasActivas() {
        return this.fichas.filter(f => f.estado_visibilidad);
    }

    obtenerFichaPorId(id) {
        return this.fichas.find(f => f.id_unico === id && f.estado_visibilidad);
    }

    // 4. Motor Lógico: Reglas de Bloqueo (V57 Upgrade)
    // El usuario pide: "Activa: no tiene ninguna otra ficha encima".
    esLibre(ficha) {
        if (!ficha.estado_visibilidad) return false;

        const activas = this.obtenerFichasActivas();

        // 1. Libertad Superior (Z-Only Blocking as requested)
        // Bloqueada si AL MENOS UNA ficha en capas superiores se solapa con ella.
        const bloqueadaSuperior = activas.some(s => {
            if (s.coord_Z <= ficha.coord_Z) return false;
            // Evaluamos solapamiento 2D (huella de 2x2 unidades)
            const overlapX = s.coord_X < ficha.coord_X + 2 && s.coord_X + 2 > ficha.coord_X;
            const overlapY = s.coord_Y < ficha.coord_Y + 2 && s.coord_Y + 2 > ficha.coord_Y;
            return overlapX && overlapY;
        });

        return !bloqueadaSuperior;
    }

    obtenerEstadoJuego(slotsCount) {
        const activas = this.obtenerFichasActivas();
        if (activas.length === 0 && slotsCount === 0) return "VICTORIA";
        if (slotsCount >= 7) return "DERROTA"; // Bandeja llena
        return "JUGANDO";
    }
}

// --------------------------------------------------------------------------------
// CLASES COMPLEMENTARIAS: VISTA y CONTROLADOR
// --------------------------------------------------------------------------------

const IMAGE_MAP = {
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

class MahjongView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        
        this.innerBoard = null;
        this.slotBar = document.getElementById('mj-slot-bar');
        this.initInnerBoard();
    }

    initInnerBoard() {
        if (this.innerBoard) return;
        this.innerBoard = document.createElement('div');
        this.innerBoard.id = 'mj-inner-board';
        this.innerBoard.style.position = 'absolute';
        this.innerBoard.style.width = '400px'; 
        this.innerBoard.style.height = '600px';
        this.innerBoard.style.pointerEvents = 'none';
        this.container.appendChild(this.innerBoard);
    }

    renderTablero(fichas, model, clickHandler) {
        if (!this.innerBoard) return;
        this.innerBoard.innerHTML = '';
        this.innerBoard.className = 'inner-board layer-shadow';

        const unitW = 32; 
        const unitH = 42; 

        fichas.forEach(f => {
            if (!f.estado_visibilidad) return;

            const isFree = model.esLibre(f);
            const div = document.createElement('div');
            div.className = `mahjong-tile ${f.flipped ? '' : 'face-down'} ${isFree ? '' : 'blocked'}`;
            div.id = `mj-tile-${f.id_unico}`;
            div.style.zIndex = f.coord_Z * 100 + f.coord_Y * 10 + f.coord_X;
            div.style.left = `${f.coord_X * unitW}px`;
            div.style.top = `${f.coord_Y * unitH}px`;
            div.style.pointerEvents = 'auto';

            const face = document.createElement('div');
            face.className = 'tile-face';
            
            const img = document.createElement('img');
            img.src = IMAGE_MAP[f.tipo_simbologia] || "placeholder.png";
            img.alt = f.tipo_simbologia;
            
            face.appendChild(img);
            div.appendChild(face);

            div.onclick = () => clickHandler(f, div);
            this.innerBoard.appendChild(div);
        });
        
        requestAnimationFrame(() => this.scaleInnerBoard());
    }

    scaleInnerBoard() {
        if (!this.container || !this.innerBoard) return;
        const ctrWidth = window.innerWidth;
        const ctrHeight = window.innerHeight;
        
        const scaleX = (ctrWidth - 20) / 400;
        const scaleY = (ctrHeight - 180) / 600; 
        let scale = Math.min(scaleX, scaleY) * 0.9;
        
        if (scale < 0.2) scale = 0.4; 
        if (scale > 4.0) scale = 4.0; 

        this.innerBoard.style.transform = `translate(-50%, -50%) scale(${scale})`;
        this.innerBoard.style.left = '50%';
        this.innerBoard.style.top = '66%';
    }

    animateToSlot(ficha, slotIndex, onComplete) {
        const div = document.getElementById(`mj-tile-${ficha.id_unico}`);
        if (!div || !this.slotBar) return;

        const rect = div.getBoundingClientRect();
        const slotEl = this.slotBar.children[slotIndex];
        const slotRect = slotEl.getBoundingClientRect();

        // Parabolic-like flight: simple transition plus scale and rotation
        div.style.transition = 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        div.style.zIndex = 2000;
        div.style.pointerEvents = 'none';

        const deltaX = slotRect.left - rect.left;
        const deltaY = slotRect.top - rect.top;

        div.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.6) rotate(360deg)`;
        
        setTimeout(() => {
            div.style.transition = 'none';
            div.style.transform = 'none';
            div.style.left = '0';
            div.style.top = '0';
            div.style.position = 'relative';
            div.className = 'mahjong-tile in-slot';
            slotEl.appendChild(div);
            if(onComplete) onComplete();
        }, 500);
    }

    refreshSlots(slots) {
        if (!this.slotBar) return;
        Array.from(this.slotBar.children).forEach((el, i) => {
            el.innerHTML = '';
            const ficha = slots[i];
            if (ficha) {
                const div = document.createElement('div');
                div.className = 'mahjong-tile in-slot';
                div.id = `mj-tile-${ficha.id_unico}`;
                const face = document.createElement('div');
                face.className = 'tile-face';
                const img = document.createElement('img');
                img.src = IMAGE_MAP[ficha.tipo_simbologia];
                face.appendChild(img);
                div.appendChild(face);
                el.appendChild(div);
            }
        });
    }
}

class MahjongController {
    constructor(view, winCallback) {
        this.view = view;
        this.model = new MahjongModel();
        this.winCallback = winCallback;
        this.enPartida = false;
        this.score = 0;
        this.timerSeconds = 0;
        this.timerInterval = null;
        this.slots = []; // Dynamic up to 7
        this.history = []; // For Undo
        
        this.pistasRestantes = 5;
        this.mezclasRestantes = 3;
    }

    iniciarJuego(layout) {
        console.log("MAHJONG: Starting new game V57 (Triple Match Mode)");
        const gameLayout = layout || window.generarLayoutMahjong();
        this.model.cargarNivel(gameLayout);
        this.enPartida = true;
        this.score = 0;
        this.timerSeconds = 0;
        this.slots = [];
        this.history = [];
        
        // Ensure 7 slots UI exist
        const slotBar = document.getElementById('mj-slot-bar');
        if (slotBar) {
            slotBar.innerHTML = '';
            for(let i=0; i<7; i++) {
                const s = document.createElement('div');
                s.className = 'mj-slot';
                slotBar.appendChild(s);
            }
        }

        this.updateHeaderUI();
        this.startTimer();
        this.render();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.updateTimerUI();
        this.timerInterval = setInterval(() => {
            if (!this.enPartida) return;
            this.timerSeconds++;
            this.updateTimerUI();
        }, 1000);
    }

    updateTimerUI() {
        const timerLabel = document.getElementById('mj-timer');
        if (timerLabel) {
            const mins = Math.floor(this.timerSeconds / 60).toString().padStart(2, '0');
            const secs = (this.timerSeconds % 60).toString().padStart(2, '0');
            timerLabel.textContent = `${mins}:${secs}`;
        }
    }

    updateHeaderUI() {
        const scoreLabel = document.getElementById('mj-score');
        if (scoreLabel) scoreLabel.textContent = this.score.toLocaleString();
        
        const hintBadge = document.getElementById('mj-hint-count');
        if (hintBadge) hintBadge.textContent = this.pistasRestantes;
        
        const shuffleBadge = document.getElementById('mj-shuffle-count');
        if (shuffleBadge) shuffleBadge.textContent = this.mezclasRestantes;
    }

    hint() {
        if (!this.enPartida || this.pistasRestantes <= 0) return;
        const activas = this.model.obtenerFichasActivas().filter(f => this.model.esLibre(f));
        // Find 3 of the same type in active
        const groups = {};
        activas.forEach(f => { groups[f.tipo_simbologia] = (groups[f.tipo_simbologia] || []); groups[f.tipo_simbologia].push(f); });
        
        let found = null;
        for (let type in groups) if (groups[type].length >= 3) { found = groups[type].slice(0, 3); break; }
        
        if (found) {
            this.pistasRestantes--;
            this.updateHeaderUI();
            found.forEach((f, i) => setTimeout(() => {
                const div = document.getElementById(`mj-tile-${f.id_unico}`);
                if (div) this.handleTileClick(f, div);
            }, i * 300));
        } else {
            window.GAME.showToast("No hay tríos disponibles ahora.");
        }
    }

    shuffle() {
        if (!this.enPartida || this.mezclasRestantes <= 0) return;
        this.mezclasRestantes--;
        const activas = this.model.obtenerFichasActivas();
        const positions = activas.map(f => ({x: f.coord_X, y: f.coord_Y, z: f.coord_Z}));
        // Shuffle positions
        for (let i = positions.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [positions[i], positions[j]] = [positions[j], positions[i]];
        }
        activas.forEach((f, i) => {
            f.coord_X = positions[i].x;
            f.coord_Y = positions[i].y;
            f.coord_Z = positions[i].z;
        });
        window.GAME.showToast("Místico: Destino reorganizado.");
        this.updateHeaderUI();
        this.render();
    }

    undo() {
        if (!this.enPartida || this.history.length === 0) return;
        const lastAction = this.history.pop();
        if (lastAction.type === 'move') {
            const ficha = lastAction.ficha;
            // Remove from slots
            this.slots = this.slots.filter(s => s.id_unico !== ficha.id_unico);
            ficha.estado_visibilidad = true;
            this.view.refreshSlots(this.slots);
            this.render();
        }
    }

    render() {
        this.view.renderTablero(this.model.fichas, this.model, (f, div) => this.handleTileClick(f, div));
    }

    handleTileClick(ficha, div) {
        if (!this.enPartida) return;

        if (!this.model.esLibre(ficha)) {
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 400);
            return; 
        }

        if (!ficha.flipped) {
            ficha.flipped = true;
            div.classList.remove('face-down');
            
            div.style.transform = 'scale(1.1) rotateY(180deg)';
            setTimeout(() => { div.style.transform = 'none'; }, 300);
            return;
        }

        if (this.slots.length >= 7) {
            window.GAME.showToast("¡Bandeja llena!");
            return;
        }

        // Logic: Insertion with automatic grouping
        // Find first occurrence of same type
        let insertIndex = this.slots.findIndex(s => s.tipo_simbologia === ficha.tipo_simbologia);
        if (insertIndex === -1) {
            insertIndex = this.slots.length;
        } else {
            // Find end of same-type group
            while (insertIndex < this.slots.length && this.slots[insertIndex].tipo_simbologia === ficha.tipo_simbologia) {
                insertIndex++;
            }
        }

        // Add to history for Undo
        this.history.push({ type: 'move', ficha: ficha });

        this.slots.splice(insertIndex, 0, ficha);
        ficha.estado_visibilidad = false; 

        // Update UI
        this.view.animateToSlot(ficha, insertIndex, () => {
            this.view.refreshSlots(this.slots);
            this.checkMatches();
        });
    }

    checkMatches() {
        // Count same types in slots
        const counts = {};
        this.slots.forEach(s => { counts[s.tipo_simbologia] = (counts[s.tipo_simbologia] || 0) + 1; });

        for (let type in counts) {
            if (counts[type] >= 3) {
                // Match 3!
                this.slots = this.slots.filter(s => s.tipo_simbologia !== type);
                this.score += 1500;
                this.updateHeaderUI();
                this.view.refreshSlots(this.slots);
                window.GAME.showToast("¡Triple Match! 🥳");
                
                // Juice: Confetti effect could go here
                break; 
            }
        }

        const estado = this.model.obtenerEstadoJuego(this.slots.length);
        if (estado === "DERROTA") {
            this.enPartida = false;
            window.GAME.showToast("¡Game Over! Bandeja llena.");
        } else if (estado === "VICTORIA") {
            this.enPartida = false;
            clearInterval(this.timerInterval);
            if (this.winCallback) this.winCallback();
        }
    }
}

// 3. Lógica de Generación de Niveles (V57 Upgrade: Multiples of 3)
function generarLayoutMahjong() {
    const layout = [];
    let id_counter = 1;
    
    const tipos = ["Eagle", "Lynx", "Frog", "Squirrel", "Deer", "Snake", "Hedgehog", "Badger", "Stag", "Barn Owl", "Hamster", "Dormouse", "Owl", "Wild Boar"];
    
    // Pool for 105 tiles (35 trios)
    let pool = [];
    for(let i = 0; i < 35; i++) { 
        let tipo = tipos[Math.floor(Math.random() * tipos.length)];
        pool.push({tipo: tipo, valor: 100});
        pool.push({tipo: tipo, valor: 100});
        pool.push({tipo: tipo, valor: 100});
    }
    
    // Shuffle pool
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const addTile = (x, y, z) => {
        if(pool.length === 0) return;
        let t = pool.pop();
        layout.push({ 
            id: id_counter++, 
            tipo: t.tipo, 
            valor: t.valor, 
            x: x, 
            y: y, 
            z: z,
            flipped: false
        });
    };

    // Capa 0: Base 7x8 (56)
    for(let r=0; r<8; r++) {
        for(let c=0; c<7; c++) {
            addTile(c * 2, r * 2, 0);
        }
    }
    
    // Capa 1: Nivel 2 (5x6 centrado = 30)
    for(let r=0; r<6; r++) {
        for(let c=0; c<5; c++) {
            addTile(c * 2 + 2, r * 2 + 2, 1);
        }
    }

    // Capa 2: Nivel 3 (3x4 centrado = 12)
    for(let r=0; r<4; r++) {
        for(let c=0; c<3; c++) {
            addTile(c * 2 + 4, r * 2 + 4, 2);
        }
    }

    // Capa 3: Ápice (3x2 + 1 = 7 fichas)
    for(let r=0; r<2; r++) {
        for(let c=0; c<3; c++) {
            addTile(c * 2 + 4, r * 2 + 6, 3);
        }
    }
    addTile(6, 7, 4); 

    return layout;
}

window.generarLayoutMahjong = generarLayoutMahjong;
window.MahjongController = MahjongController;
window.MahjongView = MahjongView;

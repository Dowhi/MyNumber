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
        this.color = color; // Para emparejar flores
    }
}

// 2. Motor Lógico (El Corazón del Modelo)
class MahjongModel {
    constructor() {
        this.fichas = [];
        this.puntuacion_global = 0;
    }

    // Carga inicial del nivel (Factory Method simplificado)
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

    // 4. Motor Lógico: Reglas de Bloqueo y Visibilidad (Free Tile)
    esLibre(ficha) {
        if (!ficha.estado_visibilidad) return false;

        const activas = this.obtenerFichasActivas();

        // 1. Libertad Superior:
        // Bloqueada si AL MENOS UNA ficha en Z+1 ocupa las mismas coordenadas 2x2.
        const bloqueadaSuperior = activas.some(s => {
            if (s.coord_Z !== ficha.coord_Z + 1) return false;
            // Evaluamos solapamiento 2D asumiendo huella de 2x2 unidades
            const overlapX = s.coord_X < ficha.coord_X + 2 && s.coord_X + 2 > ficha.coord_X;
            const overlapY = s.coord_Y < ficha.coord_Y + 2 && s.coord_Y + 2 > ficha.coord_Y;
            return overlapX && overlapY;
        });

        if (bloqueadaSuperior) return false;

        // 2. Libertad Lateral en O(1) simulado por grid entero:
        // Vecino a la izquierda: exactamente en X-2, intersecando en Y
        const bloqueadaIzquierda = activas.some(s => {
            return s.coord_Z === ficha.coord_Z && 
                   s.coord_X === ficha.coord_X - 2 && 
                   (s.coord_Y < ficha.coord_Y + 2 && s.coord_Y + 2 > ficha.coord_Y);
        });

        // Vecino a la derecha: exactamente en X+2, intersecando en Y
        const bloqueadaDerecha = activas.some(s => {
            return s.coord_Z === ficha.coord_Z && 
                   s.coord_X === ficha.coord_X + 2 && 
                   (s.coord_Y < ficha.coord_Y + 2 && s.coord_Y + 2 > ficha.coord_Y);
        });

        // La ficha está libre si carece de vecino a la izquierda O a la derecha
        return !bloqueadaIzquierda || !bloqueadaDerecha;
    }

    // Regla de emparejamiento (Scripting de Puntuación emulado)
    sonPareja(fichaA, fichaB) {
        if (!fichaA || !fichaB || fichaA.id_unico === fichaB.id_unico) return false;
        
        // Simbología exacta
        if (fichaA.tipo_simbologia === fichaB.tipo_simbologia) {
            // Regla de color para las flores
            if (fichaA.tipo_simbologia === "Flor") {
                return fichaA.color === fichaB.color;
            }
            return true;
        }

        // Estaciones (cualquiera con cualquiera)
        if (fichaA.tipo_simbologia === "Estacion" && fichaB.tipo_simbologia === "Estacion") {
            return true;
        }

        return false;
    }

    // 5. Ciclo de Vida y Gestión de Estados: Validación Lógica y Actualización
    seleccionarPareja(idA, idB) {
        const fichaA = this.obtenerFichaPorId(idA);
        const fichaB = this.obtenerFichaPorId(idB);

        if (this.sonPareja(fichaA, fichaB) && this.esLibre(fichaA) && this.esLibre(fichaB)) {
            // Remoción (estado_visibilidad = false)
            fichaA.estado_visibilidad = false;
            fichaB.estado_visibilidad = false;

            // Scripting de puntuación
            const puntos_base = fichaA.valor_puntos + fichaB.valor_puntos;
            if (fichaA.tipo_simbologia === "Flor" || fichaA.tipo_simbologia === "Estacion") {
                this.puntuacion_global += puntos_base * 2;
            } else {
                this.puntuacion_global += puntos_base;
            }

            return true; // Match exitoso
        }
        return false; // Fichas inválidas o bloqueadas
    }

    // Gestión de Estados del Juego y escaneo de pares
    obtenerEstadoJuego() {
        const activas = this.obtenerFichasActivas();
        if (activas.length === 0) return "VICTORIA";

        // Escaneo buscando pares expuestos
        for (let i = 0; i < activas.length; i++) {
            if (!this.esLibre(activas[i])) continue;
            for (let j = i + 1; j < activas.length; j++) {
                if (!this.esLibre(activas[j])) continue;
                if (this.sonPareja(activas[i], activas[j])) {
                    return "JUGANDO"; // Aún hay movimientos posibles
                }
            }
        }
        
        // El requerimiento exige exactamente esta cadena de texto
        return "Juego bloqueado!!!! Perdiste";
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
        if (!this.container) {
            console.error("FATAL: Mahjong container not found:", containerId);
            return;
        }
        
        this.baseTileWidth = 38;  // V47 Larger base for portrait
        this.baseTileHeight = 48; 
        this.offsetX = 6;  
        this.offsetY = -6; 
        
        this.innerBoard = null;
        this.selectedTileDiv = null;
        this.slotBar = document.getElementById('mj-slot-bar');
        this.initInnerBoard();
    }

    initInnerBoard() {
        if (this.innerBoard) return;
        this.innerBoard = document.createElement('div');
        this.innerBoard.id = 'mj-inner-board';
        this.innerBoard.style.position = 'absolute';
        this.innerBoard.style.width = '540px'; 
        this.innerBoard.style.height = '800px';
        this.innerBoard.style.pointerEvents = 'none'; // Only tiles catch clicks
        this.container.appendChild(this.innerBoard);
    }

    renderTablero(fichas, onTileClick) {
        if (!this.innerBoard) this.initInnerBoard();
        this.innerBoard.innerHTML = '';
        
        console.log("Rendering tiles:", fichas.length);
        fichas.sort((a, b) => a.coord_Z - b.coord_Z);

        fichas.forEach(ficha => {
            if (!ficha.estado_visibilidad) return;

            const div = document.createElement('div');
            div.className = 'mahjong-tile';
            div.id = `mj-tile-${ficha.id_unico}`;
            
            // V47: Transpose X and Y to make layout TALLER (Portrait)
            // X used for vertical, Y for horizontal
            const left = (ficha.coord_Y * this.baseTileWidth) + (ficha.coord_Z * this.offsetX);
            const top = (ficha.coord_X * this.baseTileHeight) + (ficha.coord_Z * this.offsetY);
            
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            div.style.zIndex = ficha.coord_Z * 10 + ficha.coord_X + ficha.coord_Y;
            
            // Stitch Structure: .mahjong-tile > .tile-face > img
            const face = document.createElement('div');
            face.className = 'tile-face';
            
            const img = document.createElement('img');
            img.src = IMAGE_MAP[ficha.tipo_simbologia] || IMAGE_MAP["Bambu1"];
            img.alt = ficha.tipo_simbologia;
            
            face.appendChild(img);
            div.appendChild(face);

            div.addEventListener('click', () => onTileClick(ficha, div));
            div.style.pointerEvents = 'auto';
            this.innerBoard.appendChild(div);
        });
        
        // Use requestAnimationFrame to ensure DOM is updated before measuring
        requestAnimationFrame(() => this.scaleInnerBoard());
        // Second pass after a bit just in case of screen transitions
        setTimeout(() => this.scaleInnerBoard(), 300);
    }

    scaleInnerBoard() {
        if (!this.container || !this.innerBoard) return;
        
        const isFullscreen = document.body.classList.contains('mj-fullscreen');
        const ctrWidth = isFullscreen ? window.innerWidth : (this.container.clientWidth || 390);
        const ctrHeight = isFullscreen ? window.innerHeight : (this.container.clientHeight || 844);
        
        // V47 portrait scaling optimization
        const scaleX = (ctrWidth - 10) / 540;
        const scaleY = (ctrHeight - 140) / 800; 
        let scale = Math.min(scaleX, scaleY);
        
        if (scale < 0.2) scale = 0.4; 
        if (scale > 4.0) scale = 4.0; 

        this.innerBoard.style.transform = `translate(-50%, -50%) scale(${scale})`;
        this.innerBoard.style.left = '50%';
        this.innerBoard.style.top = '70%'; // Shifted down to accommodate Slot Bar
        this.innerBoard.style.position = 'absolute';
        this.innerBoard.style.display = 'block';
    }

    animateToSlot(fichaId, slotIndex) {
        const div = document.getElementById(`mj-tile-${fichaId}`);
        if (!div || !this.slotBar) return;

        // Clone for animation to keep DOM clean
        const rect = div.getBoundingClientRect();
        const slotRect = this.slotBar.children[slotIndex].getBoundingClientRect();

        div.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
        div.style.zIndex = 2000;
        div.style.pointerEvents = 'none';

        // Convert board space to screen space for animation
        const deltaX = slotRect.left - rect.left;
        const deltaY = slotRect.top - rect.top;

        div.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.8) rotate(360deg)`;
        
        setTimeout(() => {
            // Move into the slot properly
            div.style.transition = 'none';
            div.style.transform = 'none';
            div.style.left = '0';
            div.style.top = '0';
            div.style.position = 'relative';
            this.slotBar.children[slotIndex].appendChild(div);
        }, 400);
    }

    marcarSeleccionada(div) {
        if (this.selectedTileDiv) this.selectedTileDiv.classList.remove('selected');
        this.selectedTileDiv = div;
        if (div) div.classList.add('selected');
    }
    
    eliminarDeSlots(id1, id2) {
        const div1 = document.getElementById(`mj-tile-${id1}`);
        const div2 = document.getElementById(`mj-tile-${id2}`);
        
        [div1, div2].forEach(div => {
            if (div) {
                div.style.transition = 'all 0.3s ease-out';
                div.style.transform = 'scale(1.5) rotate(15deg)';
                div.style.opacity = '0';
                setTimeout(() => div.remove(), 300);
            }
        });
    }
    
    eliminarFichas(divA, divB) {
        [divA, divB].forEach(div => {
            if (div) {
                div.classList.add('removed');
                setTimeout(() => div.remove(), 300);
            }
        });
    }

    desmarcarFichas() {
        this.marcarSeleccionada(null);
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
        this.fichaSeleccionadaId = null;
    }

    iniciarJuego(layout) {
        console.log("MAHJONG: Starting new game V48");
        const gameLayout = layout || window.generarLayoutMahjong();
        this.model.cargarNivel(gameLayout);
        this.enPartida = true;
        this.score = 0;
        this.timerSeconds = 0;
        this.slots = [null, null, null, null];
        this.pistasRestantes = 5;
        this.mezclasRestantes = 3;
        
        // Clear slots UI
        const slotBar = document.getElementById('mj-slot-bar');
        if (slotBar) Array.from(slotBar.children).forEach(s => s.innerHTML = '');

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
        if (this.pistasRestantes <= 0) return;
        this.pistasRestantes--;
        window.GAME.showToast("Místico: Los espíritus te guían...");
        this.updateHeaderUI();
    }

    shuffle() {
        if (this.mezclasRestantes <= 0) return;
        this.mezclasRestantes--;
        window.GAME.showToast("Místico: Destino reorganizado.");
        this.iniciarJuego();
    }

    undo() {
        window.GAME.showToast("El destino no puede ser cambiado.");
    }

    render() {
        this.view.renderTablero(this.model.fichas, (f, div) => this.handleTileClick(f, div));
    }

    handleTileClick(ficha, div) {
        if (!this.enPartida) return;

        // Standard Mahjong "free tile" rule still applies
        if (!this.model.esLibre(ficha)) {
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 400);
            return; 
        }

        // Find empty slot
        const emptyIndex = this.slots.indexOf(null);
        if (emptyIndex === -1) {
            window.GAME.showToast("¡Huecos llenos!");
            return;
        }

        // Logic side
        this.slots[emptyIndex] = ficha;
        ficha.estado_visibilidad = false; // "hide" from main board logic

        // View side
        this.view.animateToSlot(ficha.id_unico, emptyIndex);

        // Check for match after animation
        setTimeout(() => this.checkMatchInSlots(), 450);
    }

    checkMatchInSlots() {
        for (let i = 0; i < this.slots.length; i++) {
            if (!this.slots[i]) continue;
            for (let j = i + 1; j < this.slots.length; j++) {
                if (!this.slots[j]) continue;
                
                if (this.slots[i].tipo_simbologia === this.slots[j].tipo_simbologia) {
                    const id1 = this.slots[i].id_unico;
                    const id2 = this.slots[j].id_unico;
                    
                    this.view.eliminarDeSlots(id1, id2);
                    
                    this.slots[i] = null;
                    this.slots[j] = null;
                    this.compactSlots();
                    
                    this.score += 750;
                    this.updateHeaderUI();
                    
                    setTimeout(() => this.comprobarEstadoGlobal(), 350);
                    return;
                }
            }
        }
        
        // No match found - check if full
        if (this.slots.indexOf(null) === -1) {
            this.enPartida = false;
            window.GAME.showToast("¡Derrota! No hay más espacio.");
        }
    }

    compactSlots() {
        const newSlots = this.slots.filter(s => s !== null);
        while (newSlots.length < 4) newSlots.push(null);
        this.slots = newSlots;
        
        // Visual re-sync of slots could be added here if needed, 
        // but typically Match-2 games just leave gaps or slide them.
        // Let's slide them for V48.
        const slotBar = document.getElementById('mj-slot-bar');
        if (slotBar) {
            Array.from(slotBar.children).forEach((slot, idx) => {
                const ficha = this.slots[idx];
                slot.innerHTML = '';
                if (ficha) {
                    // This is a simple shortcut to re-render the div inside the slot
                    this.view.animateToSlot(ficha.id_unico, idx);
                }
            });
        }
    }

    comprobarEstadoGlobal() {
        const estado = this.model.obtenerEstadoJuego();
        if (estado === "Juego bloqueado!!!! Perdiste") {
            this.enPartida = false;
            clearInterval(this.timerInterval);
            window.GAME.showToast("No quedan movimientos posibles.");
        } else if (estado === "VICTORIA") {
            this.enPartida = false;
            clearInterval(this.timerInterval);
            if (this.winCallback) this.winCallback();
        }
    }
}

// Generador de layout The Turtle simplificado (Para demostración técnica)
// Generaremos 144 fichas con pares emparejables
function generarLayoutMahjong() {
    const layout = [];
    let id_counter = 1;
    
    const tipos = ["Eagle", "Lynx", "Frog", "Squirrel", "Deer", "Snake", "Hedgehog", "Badger", "Stag", "Barn Owl", "Hamster", "Dormouse", "Owl", "Wild Boar"];
    
    // Crear pool de 144 fichas en grupos de pares
    let pool = [];
    // 72 pares de animales = 144 fichas
    for(let i = 0; i < 72; i++) {
        let tipo = tipos[Math.floor(Math.random() * tipos.length)];
        pool.push({tipo: tipo, valor: 100});
        pool.push({tipo: tipo, valor: 100});
    }
    
    // Shuffle pool (Fisher-Yates) para que sea resolvible dependemos del azar, 
    // en un juego PSPACE-Completo ideal requeriríamos un generador inverso. 
    // Usaremos shuffle básico.
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // Dibujar Turtle Formation
    // La grilla base de 2 en 2
    const addTile = (x, y, z) => {
        if(pool.length === 0) return;
        let t = pool.pop();
        layout.push({ id: id_counter++, tipo: t.tipo, valor: t.valor, color: t.color, x: x, y: y, z: z });
    };

    // Capa 0 (fondo): 12 x 8 aproximado pero con huecos. Lo llenaremos simple para testeos.
    // Usaremos unidades de X, Y. Recordar: X=2 significa ocupa 2 a 3. Siguiente puede ir en 4.
    // Capa 0
    let startX = 2;
    let startY = 2;
    for(let r=0; r<6; r++) { // 6 filas
        for(let c=0; c<10; c++) { // 10 columnas
            // Excluimos esquinas
            if ((r===0 || r===5) && (c<1 || c>8)) continue;
            addTile(startX + c*2, startY + r*2, 0); // Ocupan 2x2
        }
    }
    
    // Agregamos las de los extremos (las que están en Y media)
    addTile(0, 6, 0); 
    addTile(startX + 10*2, 6, 0);
    addTile(startX + 11*2, 6, 0);

    // Capa 1
    startX += 2; startY += 2;
    for(let r=0; r<4; r++) { for(let c=0; c<6; c++) { addTile(startX + c*2, startY + r*2, 1); } }
    
    // Capa 2
    startX += 2; startY += 2;
    for(let r=0; r<2; r++) { for(let c=0; c<4; c++) { addTile(startX + c*2, startY + r*2, 2); } }
    
    // Capa 3
    startX += 2; startY += 0;
    for(let r=0; r<1; r++) { for(let c=0; c<2; c++) { addTile(startX + c*2, startY + 2, 3); } }
    
    // Capa 4 (Cúspide central desplazada 1 unidad para encajar entre medias)
    addTile(startX + 1, startY + 2 + 1, 4);

    return layout;
}

window.generarLayoutMahjong = generarLayoutMahjong;
window.MahjongController = MahjongController;
window.MahjongView = MahjongView;

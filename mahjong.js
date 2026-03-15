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

console.log("MAHJONG V6 LOADED");

class MahjongView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("FATAL: Mahjong container not found:", containerId);
            return;
        }
        
        this.baseTileWidth = 18;  
        this.baseTileHeight = 22; 
        this.offsetX = 4;  
        this.offsetY = -4; 
        
        this.innerBoard = null;
        this.selectedTileDiv = null;
        this.initInnerBoard();
    }

    initInnerBoard() {
        if (!this.container) return;
        console.log("DEBUG: Initializing Mahjong InnerBoard...");
        this.container.innerHTML = ''; 
        this.innerBoard = document.createElement('div');
        this.innerBoard.id = 'mj-inner-board';
        this.innerBoard.style.position = 'relative';
        this.innerBoard.style.width = '450px'; 
        this.innerBoard.style.height = '320px';
        this.innerBoard.style.margin = 'auto';
        this.innerBoard.style.border = '1px dashed rgba(255,255,255,0.2)'; // Helper visible en debug
        this.container.appendChild(this.innerBoard);
        console.log("DEBUG: InnerBoard attached to DOM");
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
            
            const left = (ficha.coord_X * this.baseTileWidth) + (ficha.coord_Z * this.offsetX);
            const top = (ficha.coord_Y * this.baseTileHeight) + (ficha.coord_Z * this.offsetY);
            
            div.style.left = `${left}px`;
            div.style.top = `${top}px`;
            div.style.zIndex = ficha.coord_Z * 10 + ficha.coord_X + ficha.coord_Y;
            
            div.textContent = this.obtenerTextoEmoji(ficha);
            if (ficha.tipo_simbologia === "Flor") div.style.color = ficha.color === "Rojo" ? "#e11d48" : "#2563eb";
            if (ficha.tipo_simbologia === "Estacion") div.style.color = "#16a34a";

            div.addEventListener('click', () => onTileClick(ficha, div));
            this.innerBoard.appendChild(div);
        });
        
        // Use requestAnimationFrame to ensure DOM is updated before measuring
        requestAnimationFrame(() => this.scaleInnerBoard());
        // Second pass after a bit just in case of screen transitions
        setTimeout(() => this.scaleInnerBoard(), 300);
    }

    scaleInnerBoard() {
        if (!this.container || !this.innerBoard) return;
        const ctrWidth = this.container.clientWidth;
        const ctrHeight = this.container.clientHeight;
        
        if (ctrWidth < 50 || ctrHeight < 50) {
            console.log("Container dimensions too small, retrying scale...", ctrWidth, ctrHeight);
            return;
        }

        const scaleX = (ctrWidth - 20) / 450;
        const scaleY = (ctrHeight - 40) / 320;
        const scale = Math.min(1, scaleX, scaleY);
        
        console.log(`Scaling board to: ${scale} (W:${ctrWidth} H:${ctrHeight})`);
        this.innerBoard.style.transform = `scale(${Math.max(0.4, scale)})`;
        this.innerBoard.style.transformOrigin = 'center center';
    }

    obtenerTextoEmoji(ficha) {
        const emojis = {
            "Bambu1": "🀐", "Bambu2": "🀑", "Bambu3": "🀒",
            "Caracter1": "🀇", "Caracter2": "🀈", "Caracter3": "🀉",
            "Flor": "🀢", "Estacion": "🀦",
            "Dragon": "🀄"
        };
        return emojis[ficha.tipo_simbologia] || "🀫";
    }

    marcarSeleccionada(div) {
        if (this.selectedTileDiv) {
            this.selectedTileDiv.classList.remove('selected');
        }
        this.selectedTileDiv = div;
        if (div) {
            div.classList.add('selected');
        }
    }
    
    eliminarFichas(divA, divB) {
        divA.classList.add('removed');
        divB.classList.add('removed');
        setTimeout(() => {
            if(divA.parentNode) divA.parentNode.removeChild(divA);
            if(divB.parentNode) divB.parentNode.removeChild(divB);
        }, 300); // Wait for transition
    }

    desmarcarFichas() {
        this.marcarSeleccionada(null);
    }
}

class MahjongController {
    constructor(view, onWinCallback) {
        this.model = new MahjongModel();
        this.view = view;
        this.fichaSeleccionadaId = null;
        this.enPartida = false;
        this.onWinCallback = onWinCallback; // Para dar vidas
    }

    iniciarJuego(layoutXML) {
        this.model.cargarNivel(layoutXML);
        this.enPartida = true;
        this.fichaSeleccionadaId = null;
        this.actualizarVista();
    }

    actualizarVista() {
        if (!this.enPartida) return;
        this.view.renderTablero(this.model.fichas, (ficha, div) => this.alHacerClickEnFicha(ficha, div));
        this.comprobarEstadoGlobal();
    }

    alHacerClickEnFicha(ficha, div) {
        if (!this.enPartida) return;

        // Validar que esté libre ANTES de seleccionar
        if (!this.model.esLibre(ficha)) {
            // Visual feedback of locked tile
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 300);
            return; 
        }

        if (this.fichaSeleccionadaId === null) {
            // Primera ficha
            this.fichaSeleccionadaId = ficha.id_unico;
            this.view.marcarSeleccionada(div);
        } else if (this.fichaSeleccionadaId === ficha.id_unico) {
            // Deseleccionar a sí misma
            this.fichaSeleccionadaId = null;
            this.view.desmarcarFichas();
        } else {
            // Segunda ficha
            const matchExitoso = this.model.seleccionarPareja(this.fichaSeleccionadaId, ficha.id_unico);
            
            if (matchExitoso) {
                const divA = document.getElementById(`mj-tile-${this.fichaSeleccionadaId}`);
                const divB = div;
                this.view.eliminarFichas(divA, divB);
                
                // Limpiar selección global
                this.fichaSeleccionadaId = null;
                this.view.desmarcarFichas();
                
                // Actualizar puntuación UI (si hubiera)
                console.log("Puntaje:", this.model.puntuacion_global);

                // Comprobar estado final diferido para que la animación termine
                setTimeout(() => this.comprobarEstadoGlobal(), 350);
            } else {
                // Fichas no coinciden, cambiar selección a la nueva
                this.fichaSeleccionadaId = ficha.id_unico;
                this.view.marcarSeleccionada(div);
            }
        }
    }

    comprobarEstadoGlobal() {
        const estado = this.model.obtenerEstadoJuego();
        
        if (estado === "Juego bloqueado!!!! Perdiste") {
            this.enPartida = false;
            alert(estado); 
        } else if (estado === "VICTORIA") {
            this.enPartida = false;
            alert("¡Has limpiado el tablero! ¡Ganaste 1 ❤️!");
            if (this.onWinCallback) this.onWinCallback();
        }
    }
}

// Generador de layout The Turtle simplificado (Para demostración técnica)
// Generaremos 144 fichas con pares emparejables
function generarLayoutMahjong() {
    const layout = [];
    let id_counter = 1;
    
    const tipos = ["Bambu1", "Bambu2", "Bambu3", "Caracter1", "Caracter2", "Caracter3", "Dragon"];
    
    // Crear pool de 144 fichas en grupos de pares
    let pool = [];
    // 70 pares normales = 140 fichas
    for(let i = 0; i < 70; i++) {
        let tipo = tipos[Math.floor(Math.random() * tipos.length)];
        pool.push({tipo: tipo, valor: 100});
        pool.push({tipo: tipo, valor: 100});
    }
    // 4 flores (2 pares por color)
    pool.push({tipo: "Flor", valor: 500, color: "Rojo"}); pool.push({tipo: "Flor", valor: 500, color: "Rojo"});
    pool.push({tipo: "Flor", valor: 500, color: "Azul"}); pool.push({tipo: "Flor", valor: 500, color: "Azul"});
    
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

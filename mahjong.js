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
    "Bambu1": "https://lh3.googleusercontent.com/aida-public/AB6AXuCwDfzSCaI7L3kg8PVZrPM1DuMH9qLEgDnRE0_MyqPGn653MDcOHm0zOTTsTzD1bOX2t2eEEWCS-MQX4B9Dwwm7KGAbwJr7FIiiVcHhBcMUNwPjc4m_s9dp3H2HOjxL-yXOVx19b1Dl3AM4UwXnYYoO5QIoV-DupddjYkV5IAE4kcmGS9pl-sjhDglAeKQQbcjk8R31lA2HeTJcPXcLf-OCLb75mhMyaR79PQlDWlcK7Jk2BUPs4nzDSGfp7j0Fkde1edt7nx-MM9c",
    "Bambu2": "https://lh3.googleusercontent.com/aida-public/AB6AXuDJ2BFJV-fAvk7V_JcRiovmfoxuJWoIgzfaDgyF0VWYnzN26j6YwJzbRtIa84VFckqq9g2kEDolAF9R163KYVGtNBk0smlsZUBUySkZefhAbfM5NBfPzw7qJqgxoqZeiA3NZ9HQz0fX6IRD0MayP9M09oM9wJX4GL5VRTPTWn84Lfjr0V4zep3cW38k9p7s4Jg7e50W4C69Gclzd3czbIRpJ9v-9zUTp6F8RdWFu4tuX7Czps5Cd0HTIxv78PGPkpNo6QDzIBZNG5o",
    "Bambu3": "https://lh3.googleusercontent.com/aida-public/AB6AXuCAPbYOECrOhO-Ppkhx8iR0JaQ3WN4z7t3IwouztXWuI-2uvDfZcxPCdOPOVXs4ARDTFlillhYFyIQZpDDYwTH_8DW3qAtkObQhNmOyRJ_vVjHbz8CN_zN7zbPJBCtzUiexn6KefkLklUL5A1H1GUasDklx-beLFG9wyHr9fQlOxKAJIBX1B40UPVnZN4QHLCKmy4nVCosv0TWgegV8mwDTBqLd5XnQAhoVVmE8gu32jSEzTAe6CDLpL_SpMhBsW1W_IqTzNmk_62M",
    "Caracter1": "https://lh3.googleusercontent.com/aida-public/AB6AXuA7cjXe-2dD_fkbq_3tmoC3M1EF2jOM1YLH_HOoSqjyTbaSAvuZv11TWJJYpuZ_5I_TOOtC8KcnrVpsesnjQJrIBMiqYZYhXL8qQTMtYUfVZODPHVbKJyAMIhwGS2VyzJps7V9DjrEOWx163QXQh2_g6wm3XZ6SNIuZUp_wa3Kn8Spo2g9FUwL12DRD0BHD0IqePiV6Efsw3ljtTbdO4QyVITmClLLqdDc-j4CttUg0lvegZJD7HoE1L-wVVXEox3R8jnQuAcLtzVs",
    "Caracter2": "https://lh3.googleusercontent.com/aida-public/AB6AXuArrPyVsVXKLXSoePsU_A8juYk533EajqF4GkZX3FJ4DohyLDv2zn8v_4kY0KnxWf-4Ft9g8QGuDmVvaC4GS_l46iC_GNIUAVAzvN4-EWLoXO3fxnqLjAKeJ9E5EcBp886qb6RSCUn2X1tRJsMKwyBE_bteWkuJ4b13GfWSwk6rfPbZ985Bk5cgxHxHIXUREV3lzr8wDIec2UkgpE77epcBOk1QUPKXMF_yY75LuJlsSjnzeRzhjJxKAGt6CIPATof6R86_bYba-xM",
    "Caracter3": "https://lh3.googleusercontent.com/aida-public/AB6AXuAW64WfflFzWxrxVSqvWBpbsJrqmlf420M7UqjpafdjdLPQP35XOgL1fYdNOkgXeqHMeZOS_LJv7idGe3USZ7sEaE_SSYhCLOmlfwdNNwTPVemtaGpJLiwvg-PqxDR3sxVSd3PIcduLXsUsp-wBRYpzwlcAl9-3cwmnXm4mzKVUilu9Tu0X5qlTpWtaCRY8B0uW4VGJf8MNiEYato7o_4UsE4K63yJiGMtjjpYCeYIkazR2N1MyT8eNqkVgA20Fm71fTEdUJ6zAt5s",
    "Dragon": "https://lh3.googleusercontent.com/aida-public/AB6AXuAiL6fh6ObePp4SOU2w4Fj68KoD1ApuWAPPxgGFvwFI2UJNM_6OCc6x-IMLGZxsa1XRmxuHBvaqNm0TxeFnRNPxpa2-V2IADIzVQmZo_qNhqP33NXXUi22CRT7E4F09audJj1QCLpVutGWnNi8X8DsbnymDd5u3nUFq_El5LB8TQUC-xVt3ty-uxSnCCgqsc_aIBbugqmXVCxWul1ftt-kwqRzEeDm9hUIAeBnafZ-H2yF96E0Kei0Zukl-jK56zOos2sGkNzanEag",
    "Flor": "https://lh3.googleusercontent.com/aida-public/AB6AXuCDRkp0Wr_rNuYwCQYkk30qdMb6Aga2MtEB46X4C2GKN0AnO9YWb6E6pYs3MWO_dha_hHs6D8BPrHS95ZTwBX5P-D-GkVkxT9QjRz--WQ0Ct89FDxkiBj7ClwWPbooVPygBss8oXbPKb99lb6jqXUrrhk6kDBHMBhxoC29mxPofTqgPFdCH_ZEoXl9mvBNNsqFPB7fFsebOmtJ6sCJJ11_Uhfzbz3CxSdsJo8XbkfhYyRcnTVMSOAcMldQ-4cA2TG8ejlYd-D2dBzk"
};

class MahjongView {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error("FATAL: Mahjong container not found:", containerId);
            return;
        }
        
        this.baseTileWidth = 24;  // Aumentado para mejor visibilidad en escritorio
        this.baseTileHeight = 32; 
        this.offsetX = 6;  
        this.offsetY = -6; 
        
        this.innerBoard = null;
        this.selectedTileDiv = null;
        this.initInnerBoard();
    }

    initInnerBoard() {
        if (!this.container) return;
        this.container.innerHTML = ''; 
        this.innerBoard = document.createElement('div');
        this.innerBoard.id = 'mj-inner-board';
        this.innerBoard.style.position = 'relative';
        this.innerBoard.style.width = '600px'; 
        this.innerBoard.style.height = '440px';
        this.innerBoard.style.margin = 'auto';
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
            
            const left = (ficha.coord_X * this.baseTileWidth) + (ficha.coord_Z * this.offsetX);
            const top = (ficha.coord_Y * this.baseTileHeight) + (ficha.coord_Z * this.offsetY);
            
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
            this.innerBoard.appendChild(div);
        });
        
        // Use requestAnimationFrame to ensure DOM is updated before measuring
        requestAnimationFrame(() => this.scaleInnerBoard());
        // Second pass after a bit just in case of screen transitions
        setTimeout(() => this.scaleInnerBoard(), 300);
    }

    scaleInnerBoard() {
        if (!this.container || !this.innerBoard) return;
        const ctrWidth = this.container.clientWidth || window.innerWidth;
        const ctrHeight = this.container.clientHeight || (window.innerHeight - 150);
        
        // Calculamos escala basada en un diseño base de 640x480
        const scaleX = (ctrWidth - 40) / 640;
        const scaleY = (ctrHeight - 40) / 480;
        let scale = Math.min(scaleX, scaleY);
        
        // Safety bounds
        if (scale < 0.2) scale = 0.5; 
        if (scale > 3.0) scale = 3.0; // Permitir que crezcan más en pantallas grandes

        this.innerBoard.style.transform = `translate(-50%, -50%) scale(${scale})`;
        this.innerBoard.style.left = '50%';
        this.innerBoard.style.top = '50%';
        this.innerBoard.style.position = 'absolute';
    }

    marcarSeleccionada(div) {
        if (this.selectedTileDiv) this.selectedTileDiv.classList.remove('selected');
        this.selectedTileDiv = div;
        if (div) div.classList.add('selected');
    }
    
    eliminarFichas(divA, divB) {
        divA.classList.add('removed');
        divB.classList.add('removed');
        setTimeout(() => {
            if(divA.parentNode) divA.parentNode.removeChild(divA);
            if(divB.parentNode) divB.parentNode.removeChild(divB);
        }, 300);
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
        console.log("MAHJONG: Starting new game");
        const gameLayout = layout || window.generarLayoutMahjong();
        this.model.cargarNivel(gameLayout);
        this.enPartida = true;
        this.score = 0;
        this.timerSeconds = 0;
        this.fichaSeleccionadaId = null;
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
    }

    hint() {
        window.GAME.showToast("Pista: El camino está despejado ✨");
    }

    shuffle() {
        window.GAME.showToast("Místico: Tablero reorganizado...");
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

        if (!this.model.esLibre(ficha)) {
            div.classList.add('shake');
            setTimeout(() => div.classList.remove('shake'), 400);
            return; 
        }

        if (this.fichaSeleccionadaId === null) {
            this.fichaSeleccionadaId = ficha.id_unico;
            this.view.marcarSeleccionada(div);
        } else if (this.fichaSeleccionadaId === ficha.id_unico) {
            this.fichaSeleccionadaId = null;
            this.view.desmarcarFichas();
        } else {
            const matchExitoso = this.model.seleccionarPareja(this.fichaSeleccionadaId, ficha.id_unico);
            if (matchExitoso) {
                const divA = document.getElementById(`mj-tile-${this.fichaSeleccionadaId}`);
                const divB = div;
                this.view.eliminarFichas(divA, divB);
                
                this.score += 500;
                this.updateHeaderUI();
                
                this.fichaSeleccionadaId = null;
                this.view.desmarcarFichas();
                
                setTimeout(() => this.comprobarEstadoGlobal(), 350);
            } else {
                this.fichaSeleccionadaId = ficha.id_unico;
                this.view.marcarSeleccionada(div);
            }
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

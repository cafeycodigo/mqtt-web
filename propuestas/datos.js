const proposals = {
    laberinto: {
        title: 'Laberinto contrarreloj',
        summary: 'Encuentra la salida de un laberinto antes de que se agote el tiempo.',
        players: '1 persona',
        controls: 'Cuatro direcciones desde el tablero.',
        objective: 'Llegar a la salida verde. Cada intento comienza en el mismo punto.',
        model: 'Muros que bloquean el paso, una ficha del jugador y la salida señalizada en verde.',
        input: { accion: 'derecha' },
        state: { posicion: [2, 4], tiempoRestante: 18, intentos: 1 },
        note: 'El juego comprueba los choques con los muros y conserva el cronómetro. El tablero muestra el tiempo que recibe del juego.'
    },
    orbita: {
        title: 'Órbita',
        summary: 'Pilota una nave entre asteroides y administra el combustible.',
        players: '1 persona',
        controls: 'Girar a izquierda o derecha y mantener el impulso.',
        objective: 'Sobrevivir y sumar puntos al esquivar obstáculos.',
        model: 'Nave con cabina y propulsores, un campo de asteroides y un planeta anillado.',
        input: { botones: ['izquierda', 'impulso'] },
        state: { combustible: 68, puntos: 240, resultado: '' },
        note: 'El juego calcula el movimiento y las colisiones. El tablero envía la dirección y el impulso, y recibe combustible y puntaje.'
    },
    memoria: {
        title: 'Memoria de señales',
        summary: 'Observa una secuencia de luces y repítela en el orden correcto.',
        players: '1 persona',
        controls: 'Cuatro pulsadores de color.',
        objective: 'Completar tantas rondas como sea posible. Cada ronda añade una señal.',
        model: 'Consola de cuatro pulsadores luminosos con rejilla de altavoz.',
        input: { accion: 'verde', ronda: 3 },
        state: { ronda: 3, fase: 'respuesta', aciertos: 2 },
        note: 'El juego genera y valida la secuencia. El número de ronda permite descartar pulsaciones atrasadas.'
    },
    puente: {
        title: 'Puente a dos',
        summary: 'Coordina los saltos de un explorador con la activación de plataformas.',
        players: '2 personas, en cooperación',
        controls: 'Una persona mueve y hace saltar al explorador. La otra activa las plataformas.',
        objective: 'Cruzar de una orilla a otra sin caer al río.',
        model: 'Dos orillas rocosas, un río y tres tramos móviles de pasarela.',
        input: { jugador: 2, accion: 'tramo-2' },
        state: { plataformasActivas: [1, 2], caidas: 0 },
        note: 'El juego recibe órdenes de ambos tableros y publica un estado común. Solo el operador puede activar la pasarela.'
    },
    pong: {
        title: 'Pong en red',
        summary: 'Devuelve la pelota desde tu lado de la mesa y supera al otro jugador.',
        players: '2 personas',
        controls: 'Subir o bajar la raqueta desde cada dispositivo.',
        objective: 'Llegar a 11 puntos con al menos dos de ventaja.',
        model: 'Mesa de juego con red, dos raquetas y una pelota en juego.',
        input: { botones: ['abajo'] },
        state: { pelota: [312, 220], raquetas: [122, 266], marcador: [4, 3] },
        note: 'El anfitrión calcula los rebotes y el marcador. Ambos tableros reciben el mismo estado para mostrar la partida.'
    },
    cuatro: {
        title: 'Cuatro en línea',
        summary: 'Deja caer fichas por turnos y forma una línea antes que tu rival.',
        players: '2 personas, por turnos',
        controls: 'Elegir una de las siete columnas.',
        objective: 'Conectar cuatro fichas del mismo color en horizontal, vertical o diagonal.',
        model: 'Tablero perforado de siete columnas y seis filas, con fichas en posición de partida.',
        input: { accion: 'columna-4', turno: 9 },
        state: { jugada: { columna: 4, fila: 3, jugador: 1 }, siguienteJugador: 2, resultado: '' },
        note: 'El juego valida la columna y el turno. Así puede rechazar una repetición de la jugada aunque el mensaje llegue dos veces.'
    },
    carrera: {
        title: 'Carrera de balizas',
        summary: 'Completa un circuito y registra los puntos de control en orden.',
        players: '2 a 4 personas',
        controls: 'Cada tablero envía aceleración, frenado y dirección de su vehículo.',
        objective: 'Cruzar la meta después de pasar por todas las balizas y completar las vueltas.',
        model: 'Circuito con vehículos, línea de salida y balizas en los puntos de control.',
        input: { jugador: 3, botones: ['acelerar', 'izquierda'] },
        state: { clasificacion: [3, 1, 4, 2], autos: [{ vuelta: 2, baliza: 3 }] },
        note: 'El juego confirma el orden de paso por las balizas y publica la clasificación de la sala.'
    }
};

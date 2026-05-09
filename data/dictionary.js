// Diccionario base — vocabulario con emoji y silabeo.
//
// Es la fuente de verdad para "qué palabras sabe representar la app".
// Otros ficheros (data/words.js, futuros juegos de memoria, emparejar,
// etc.) referencian palabras de aquí por su `word` y NO redefinen ni
// el emoji ni el silabeo — para que crecer el vocabulario sea cambiar
// un único sitio.
//
// Reglas de silabeo aplicadas:
//   • LL, CH, RR son una sola unidad: nunca se separan.
//   • BL BR CL CR DR FL FR GL GR PL PR TR son grupos inseparables.
//   • Diptongos crecientes/decrecientes (ie, ue, ai, au…) se mantienen.
//   • Hiatos: dos vocales fuertes (a, e, o) se separan; tilde en débil
//     (í, ú) rompe el diptongo (ej. SAN-DÍ-A, MA-ÍZ, BÚ-HO con H muda).
//   • Ñ, H muda, Z, J, Y se tratan como consonantes simples.
//
// Convenciones:
//   • `word` siempre en MAYÚSCULAS, sin guiones.
//   • `syllables` en MAYÚSCULAS preservando tildes (PLÁ-TA-NO, NÍ-A…).
//   • Un único `emoji` por palabra; si necesita variación de presentación
//     se incluye el selector U+FE0F (\u{FE0F}).

(function () {
  const SCHEMA = {
    name: "dictionary",
    fields: {
      word:      { type: "string", required: true },
      syllables: { type: "array", of: { type: "string" }, required: true },
      // Representación gráfica: `svg` (archivo en assets/svg/) tiene
      // prioridad sobre `emoji` si están los dos. Ambos son opcionales
      // a nivel de schema, pero AL MENOS UNO debe estar presente — eso
      // se comprueba abajo con un check custom porque el validador
      // genérico no sabe expresar "uno-de".
      emoji:     { type: "string", required: false },
      svg:       { type: "string", required: false },
      // Categoría para juegos que necesitan agrupar visualmente
      // (p.ej. "Busca el dibujo" mezcla solo entradas del mismo
      // grupo). Una de las claves listadas en CATEGORIES más abajo.
      category:  { type: "string", required: true },
    },
  };

  // Catálogo de categorías reconocidas. Si añades una nueva, súmala
  // aquí; el validator la usa para detectar typos.
  const CATEGORIES = new Set([
    "animales", "vegetales", "comida", "hogar", "naturaleza",
    "cuerpo", "transporte", "ropa", "musica", "fantasia",
  ]);

  // Agrupado por categoría para escanear rápido qué cubrimos. El orden
  // dentro del array no afecta a los juegos: estos buscan por `word`.
  const DATA = [
    // ── Animales ─────────────────────────────────────────────
    { word: "GATO",         syllables: ["GA","TO"],                 emoji: "🐱", category: "animales" },
    { word: "PERRO",        syllables: ["PE","RRO"],                emoji: "🐶", category: "animales" },
    { word: "PATO",         syllables: ["PA","TO"],                 emoji: "🦆", category: "animales" },
    { word: "OSO",          syllables: ["O","SO"],                  emoji: "🐻", category: "animales" },
    { word: "RANA",         syllables: ["RA","NA"],                 emoji: "🐸", category: "animales" },
    { word: "VACA",         syllables: ["VA","CA"],                 emoji: "🐮", category: "animales" },
    { word: "FOCA",         syllables: ["FO","CA"],                 emoji: "🦭", category: "animales" },
    { word: "TORO",         syllables: ["TO","RO"],                 emoji: "🐂", category: "animales" },
    { word: "LOBO",         syllables: ["LO","BO"],                 emoji: "🐺", category: "animales" },
    { word: "ZORRO",        syllables: ["ZO","RRO"],                emoji: "🦊", category: "animales" },
    { word: "MONO",         syllables: ["MO","NO"],                 emoji: "🐵", category: "animales" },
    { word: "PEZ",          syllables: ["PEZ"],                     emoji: "🐟", category: "animales" },
    { word: "GALLINA",      syllables: ["GA","LLI", "NA"],          emoji: "🐔", category: "animales" },
    { word: "GALLO",        syllables: ["GA","LLO"],                emoji: "🐓", category: "animales" },
    { word: "CISNE",        syllables: ["CIS","NE"],                emoji: "🦢", category: "animales" },
    { word: "PANDA",        syllables: ["PAN","DA"],                emoji: "🐼", category: "animales" },
    { word: "KOALA",        syllables: ["KO","A","LA"],             emoji: "🐨", category: "animales" },
    { word: "LEÓN",         syllables: ["LE","ÓN"],                 emoji: "🦁", category: "animales" },
    { word: "BÚHO",         syllables: ["BÚ","HO"],                 emoji: "🦉", category: "animales" },
    { word: "LORO",         syllables: ["LO","RO"],                 emoji: "🦜", category: "animales" },
    { word: "ERIZO",        syllables: ["E","RI","ZO"],             emoji: "🦔", category: "animales" },
    { word: "CABRA",        syllables: ["CA","BRA"],                emoji: "🐐", category: "animales" },
    { word: "OVEJA",        syllables: ["O","VE","JA"],             emoji: "🐑", category: "animales" },
    { word: "TIGRE",        syllables: ["TI","GRE"],                emoji: "🐯", category: "animales" },
    { word: "CERDO",        syllables: ["CER","DO"],                emoji: "🐷", category: "animales" },
    { word: "RATÓN",        syllables: ["RA","TÓN"],                emoji: "🐭", category: "animales" },
    { word: "CABALLO",      syllables: ["CA","BA","LLO"],           emoji: "🐴", category: "animales" },
    { word: "CONEJO",       syllables: ["CO","NE","JO"],            emoji: "🐰", category: "animales" },
    { word: "PULPO",        syllables: ["PUL","PO"],                emoji: "🐙", category: "animales" },
    { word: "CARACOL",      syllables: ["CA","RA","COL"],           emoji: "🐌", category: "animales" },
    { word: "ABEJA",        syllables: ["A","BE","JA"],             emoji: "🐝", category: "animales" },
    { word: "ARAÑA",        syllables: ["A","RA","ÑA"],             emoji: "🕷\u{FE0F}", category: "animales" },
    { word: "HORMIGA",      syllables: ["HOR","MI","GA"],           emoji: "🐜", category: "animales" },
    { word: "POLLITO",      syllables: ["PO","LLI","TO"],           emoji: "🐤", category: "animales" },
    { word: "TORTUGA",      syllables: ["TOR","TU","GA"],           emoji: "🐢", category: "animales" },
    { word: "DELFÍN",       syllables: ["DEL","FÍN"],               emoji: "🐬", category: "animales" },
    { word: "TIBURÓN",      syllables: ["TI","BU","RÓN"],           emoji: "🦈", category: "animales" },
    { word: "BALLENA",      syllables: ["BA","LLE","NA"],           emoji: "🐳", category: "animales" },
    { word: "JIRAFA",       syllables: ["JI","RA","FA"],            emoji: "🦒", category: "animales" },
    { word: "CAMELLO",      syllables: ["CA","ME","LLO"],           emoji: "🐪", category: "animales" },
    { word: "CEBRA",        syllables: ["CE","BRA"],                emoji: "🦓", category: "animales" },
    { word: "LAGARTO",      syllables: ["LA","GAR","TO"],           emoji: "🦎", category: "animales" },
    { word: "SERPIENTE",    syllables: ["SER","PIEN","TE"],         emoji: "🐍", category: "animales" },
    { word: "ELEFANTE",     syllables: ["E","LE","FAN","TE"],       emoji: "🐘", category: "animales" },
    { word: "MURCIÉLAGO",   syllables: ["MUR","CIÉ","LA","GO"],     emoji: "🦇", category: "animales" },
    { word: "PINGÜINO",     syllables: ["PIN","GÜI","NO"],          emoji: "🐧", category: "animales" },
    { word: "COCODRILO",    syllables: ["CO","CO","DRI","LO"],      emoji: "🐊", category: "animales" },
    { word: "MARIPOSA",     syllables: ["MA","RI","PO","SA"],       emoji: "🦋", category: "animales" },

    // ── Frutas y verduras ────────────────────────────────────
    { word: "MANZANA",      syllables: ["MAN","ZA","NA"],           emoji: "🍎", svg: "manzana.svg", category: "vegetales" },
    { word: "PERA",         syllables: ["PE","RA"],                 emoji: "🍐", category: "vegetales" },
    { word: "UVA",          syllables: ["U","VA"],                  emoji: "🍇", category: "vegetales" },
    { word: "FRESA",        syllables: ["FRE","SA"],                emoji: "🍓", category: "vegetales" },
    { word: "PIÑA",         syllables: ["PI","ÑA"],                 emoji: "🍍", category: "vegetales" },
    { word: "MANGO",        syllables: ["MAN","GO"],                emoji: "🥭", category: "vegetales" },
    { word: "COCO",         syllables: ["CO","CO"],                 emoji: "🥥", category: "vegetales" },
    { word: "KIWI",         syllables: ["KI","WI"],                 emoji: "🥝", category: "vegetales" },
    { word: "LIMÓN",        syllables: ["LI","MÓN"],                emoji: "🍋", category: "vegetales" },
    { word: "MELÓN",        syllables: ["ME","LÓN"],                emoji: "🍈", category: "vegetales" },
    { word: "SANDÍA",       syllables: ["SAN","DÍ","A"],            emoji: "🍉", category: "vegetales" },
    { word: "NARANJA",      syllables: ["NA","RAN","JA"],           emoji: "🍊", category: "vegetales" },
    { word: "PLÁTANO",      syllables: ["PLÁ","TA","NO"],           emoji: "🍌", category: "vegetales" },
    { word: "CEREZA",       syllables: ["CE","RE","ZA"],            emoji: "🍒", category: "vegetales" },
    { word: "AGUACATE",     syllables: ["A","GUA","CA","TE"],       emoji: "🥑", category: "vegetales" },
    { word: "TOMATE",       syllables: ["TO","MA","TE"],            emoji: "🍅", category: "vegetales" },
    { word: "CEBOLLA",      syllables: ["CE","BO","LLA"],           emoji: "🧅", category: "vegetales" },
    { word: "AJO",          syllables: ["A","JO"],                  emoji: "🧄", category: "vegetales" },
    { word: "PATATA",       syllables: ["PA","TA","TA"],            emoji: "🥔", category: "vegetales" },
    { word: "ZANAHORIA",    syllables: ["ZA","NA","HO","RIA"],      emoji: "🥕", category: "vegetales" },
    { word: "MAÍZ",         syllables: ["MA","ÍZ"],                 emoji: "🌽", category: "vegetales" },
    { word: "LECHUGA",      syllables: ["LE","CHU","GA"],           emoji: "🥬", category: "vegetales" },
    { word: "PEPINO",       syllables: ["PE","PI","NO"],            emoji: "🥒", category: "vegetales" },
    { word: "BRÓCOLI",      syllables: ["BRÓ","CO","LI"],           emoji: "🥦", category: "vegetales" },
    { word: "BERENJENA",    syllables: ["BE","REN","JE","NA"],      emoji: "🍆", category: "vegetales" },
    { word: "PIMIENTO",     syllables: ["PI","MIEN","TO"],          emoji: "🫑", category: "vegetales" },
    { word: "SETA",         syllables: ["SE","TA"],                 emoji: "🍄", category: "vegetales" },

    // ── Comida y bebidas ─────────────────────────────────────
    { word: "PAN",          syllables: ["PAN"],                     emoji: "🍞", category: "comida" },
    { word: "QUESO",        syllables: ["QUE","SO"],                emoji: "🧀", category: "comida" },
    { word: "HUEVO",        syllables: ["HUE","VO"],                emoji: "🥚", category: "comida" },
    { word: "LECHE",        syllables: ["LE","CHE"],                emoji: "🥛", category: "comida" },
    { word: "MIEL",         syllables: ["MIEL"],                    emoji: "🍯", category: "comida" },
    { word: "TARTA",        syllables: ["TAR","TA"],                emoji: "🎂", category: "comida" },
    { word: "HELADO",       syllables: ["HE","LA","DO"],            emoji: "🍦", category: "comida" },
    { word: "GALLETA",      syllables: ["GA","LLE","TA"],           emoji: "🍪", category: "comida" },
    { word: "CHOCOLATE",    syllables: ["CHO","CO","LA","TE"],      emoji: "🍫", category: "comida" },
    { word: "HAMBURGUESA",  syllables: ["HAM","BUR","GUE","SA"],    emoji: "🍔", category: "comida" },
    { word: "TACO",         syllables: ["TA","CO"],                 emoji: "🌮", category: "comida" },
    { word: "PALOMITAS",    syllables: ["PA","LO","MI","TAS"],      emoji: "🍿", category: "comida" },
    { word: "TÉ",           syllables: ["TÉ"],                      emoji: "🍵", category: "comida" },

    // ── Hogar y objetos ──────────────────────────────────────
    { word: "CASA",         syllables: ["CA","SA"],                 emoji: "🏠", category: "hogar" },
    { word: "SILLA",        syllables: ["SI","LLA"],                emoji: "🪑", category: "hogar" },
    { word: "CAMA",         syllables: ["CA","MA"],                 emoji: "🛏\u{FE0F}", category: "hogar" },
    { word: "SOFÁ",         syllables: ["SO","FÁ"],                 emoji: "🛋\u{FE0F}", category: "hogar" },
    { word: "PUERTA",       syllables: ["PUER","TA"],               emoji: "🚪", category: "hogar" },
    { word: "LLAVE",        syllables: ["LLA","VE"],                emoji: "🔑", category: "hogar" },
    { word: "VENTANA",      syllables: ["VEN","TA","NA"],           emoji: "🪟", category: "hogar" },
    { word: "LIBRO",        syllables: ["LI","BRO"],                emoji: "📕", category: "hogar" },
    { word: "LÁPIZ",        syllables: ["LÁ","PIZ"],                emoji: "✏\u{FE0F}", category: "hogar" },
    { word: "REGLA",        syllables: ["RE","GLA"],                emoji: "📏", category: "hogar" },
    { word: "RELOJ",        syllables: ["RE","LOJ"],                emoji: "⏰", category: "hogar" },
    { word: "TIJERAS",      syllables: ["TI","JE","RAS"],           emoji: "✂\u{FE0F}", category: "hogar" },
    { word: "MARTILLO",     syllables: ["MAR","TI","LLO"],          emoji: "🔨", category: "hogar" },
    { word: "ESCOBA",       syllables: ["ES","CO","BA"],            emoji: "🧹", category: "hogar" },
    { word: "JABÓN",        syllables: ["JA","BÓN"],                emoji: "🧼", category: "hogar" },
    { word: "ESPONJA",      syllables: ["ES","PON","JA"],           emoji: "🧽", category: "hogar" },
    { word: "BOMBILLA",     syllables: ["BOM","BI","LLA"],          emoji: "💡", category: "hogar" },
    { word: "VELA",         syllables: ["VE","LA"],                 emoji: "🕯\u{FE0F}", category: "hogar" },
    { word: "TELÉFONO",     syllables: ["TE","LÉ","FO","NO"],       emoji: "📱", category: "hogar" },
    { word: "CÁMARA",       syllables: ["CÁ","MA","RA"],            emoji: "📷", category: "hogar" },

    // ── Naturaleza y clima ───────────────────────────────────
    { word: "SOL",          syllables: ["SOL"],                     emoji: "☀\u{FE0F}", category: "naturaleza" },
    { word: "LUNA",         syllables: ["LU","NA"],                 emoji: "🌙", category: "naturaleza" },
    { word: "ESTRELLA",     syllables: ["ES","TRE","LLA"],          emoji: "⭐", category: "naturaleza" },
    { word: "NUBE",         syllables: ["NU","BE"],                 emoji: "☁\u{FE0F}", category: "naturaleza" },
    { word: "LLUVIA",       syllables: ["LLU","VIA"],               emoji: "🌧\u{FE0F}", category: "naturaleza" },
    { word: "NIEVE",        syllables: ["NIE","VE"],                emoji: "❄\u{FE0F}", category: "naturaleza" },
    { word: "RAYO",         syllables: ["RA","YO"],                 emoji: "⚡", category: "naturaleza" },
    { word: "ARCOÍRIS",     syllables: ["AR","CO","Í","RIS"],       emoji: "🌈", category: "naturaleza" },
    { word: "FLOR",         syllables: ["FLOR"],                    emoji: "🌸", category: "naturaleza" },
    { word: "ROSA",         syllables: ["RO","SA"],                 emoji: "🌹", category: "naturaleza" },
    { word: "HOJA",         syllables: ["HO","JA"],                 emoji: "🍃", category: "naturaleza" },
    { word: "ÁRBOL",        syllables: ["ÁR","BOL"],                emoji: "🌳", category: "naturaleza" },
    { word: "PALMERA",      syllables: ["PAL","ME","RA"],           emoji: "🌴", category: "naturaleza" },
    { word: "CACTUS",       syllables: ["CAC","TUS"],               emoji: "🌵", category: "naturaleza" },
    { word: "FUEGO",        syllables: ["FUE","GO"],                emoji: "🔥", category: "naturaleza" },
    { word: "AGUA",         syllables: ["A","GUA"],                 emoji: "💧", category: "naturaleza" },
    { word: "MAR",          syllables: ["MAR"],                     emoji: "🌊", category: "naturaleza" },
    { word: "MONTAÑA",      syllables: ["MON","TA","ÑA"],           emoji: "⛰\u{FE0F}", category: "naturaleza" },
    { word: "VOLCÁN",       syllables: ["VOL","CÁN"],               emoji: "🌋", category: "naturaleza" },
    { word: "PLAYA",        syllables: ["PLA","YA"],                emoji: "🏖\u{FE0F}", category: "naturaleza" },
    { word: "ISLA",         syllables: ["IS","LA"],                 emoji: "🏝\u{FE0F}", category: "naturaleza" },
    { word: "TIERRA",       syllables: ["TIE","RRA"],               emoji: "🌍", category: "naturaleza" },
    { word: "PIEDRA",       syllables: ["PIE","DRA"],               emoji: "🪨", category: "naturaleza" },

    // ── Cuerpo ───────────────────────────────────────────────
    { word: "OJO",          syllables: ["O","JO"],                  emoji: "👁\u{FE0F}", category: "cuerpo" },
    { word: "BOCA",         syllables: ["BO","CA"],                 emoji: "👄", category: "cuerpo" },
    { word: "OREJA",        syllables: ["O","RE","JA"],             emoji: "👂", category: "cuerpo" },
    { word: "NARIZ",        syllables: ["NA","RIZ"],                emoji: "👃", category: "cuerpo" },
    { word: "MANO",         syllables: ["MA","NO"],                 emoji: "✋", category: "cuerpo" },
    { word: "DEDO",         syllables: ["DE","DO"],                 emoji: "👆", category: "cuerpo" },
    { word: "PIE",          syllables: ["PIE"],                     emoji: "🦶", category: "cuerpo" },
    { word: "PIERNA",       syllables: ["PIER","NA"],               emoji: "🦵", category: "cuerpo" },
    { word: "BRAZO",        syllables: ["BRA","ZO"],                emoji: "💪", category: "cuerpo" },
    { word: "DIENTE",       syllables: ["DIEN","TE"],               emoji: "🦷", category: "cuerpo" },
    { word: "HUESO",        syllables: ["HUE","SO"],                emoji: "🦴", category: "cuerpo" },
    { word: "LENGUA",       syllables: ["LEN","GUA"],               emoji: "👅", category: "cuerpo" },

    // ── Transporte ───────────────────────────────────────────
    { word: "COCHE",        syllables: ["CO","CHE"],                emoji: "🚗", category: "transporte" },
    { word: "MOTO",         syllables: ["MO","TO"],                 emoji: "🏍\u{FE0F}", category: "transporte" },
    { word: "BICI",         syllables: ["BI","CI"],                 emoji: "🚲", category: "transporte" },
    { word: "AUTOBÚS",      syllables: ["AU","TO","BÚS"],           emoji: "🚌", category: "transporte" },
    { word: "CAMIÓN",       syllables: ["CA","MIÓN"],               emoji: "🚚", category: "transporte" },
    { word: "TRACTOR",      syllables: ["TRAC","TOR"],              emoji: "🚜", category: "transporte" },
    { word: "TREN",         syllables: ["TREN"],                    emoji: "🚂", category: "transporte" },
    { word: "AVIÓN",        syllables: ["A","VIÓN"],                emoji: "✈\u{FE0F}", category: "transporte" },
    { word: "BARCO",        syllables: ["BAR","CO"],                emoji: "⛵", category: "transporte" },
    { word: "COHETE",       syllables: ["CO","HE","TE"],            emoji: "🚀", category: "transporte" },
    { word: "HELICÓPTERO",  syllables: ["HE","LI","CÓP","TE","RO"], emoji: "🚁", category: "transporte" },

    // ── Ropa y accesorios ────────────────────────────────────
    { word: "ZAPATO",       syllables: ["ZA","PA","TO"],            emoji: "👞", category: "ropa" },
    { word: "BOTA",         syllables: ["BO","TA"],                 emoji: "👢", category: "ropa" },
    { word: "CALCETÍN",     syllables: ["CAL","CE","TÍN"],          emoji: "🧦", category: "ropa" },
    { word: "GUANTE",       syllables: ["GUAN","TE"],               emoji: "🧤", category: "ropa" },
    { word: "BUFANDA",      syllables: ["BU","FAN","DA"],           emoji: "🧣", category: "ropa" },
    { word: "VESTIDO",      syllables: ["VES","TI","DO"],           emoji: "👗", category: "ropa" },
    { word: "GAFAS",        syllables: ["GA","FAS"],                emoji: "👓", category: "ropa" },
    { word: "GORRA",        syllables: ["GO","RRA"],                emoji: "🧢", category: "ropa" },
    { word: "SOMBRERO",     syllables: ["SOM","BRE","RO"],          emoji: "🎩", category: "ropa" },
    { word: "CORONA",       syllables: ["CO","RO","NA"],            emoji: "👑", category: "ropa" },
    { word: "ANILLO",       syllables: ["A","NI","LLO"],            emoji: "💍", category: "ropa" },
    { word: "MOCHILA",      syllables: ["MO","CHI","LA"],           emoji: "🎒", category: "ropa" },
    { word: "BOLSO",        syllables: ["BOL","SO"],                emoji: "👜", category: "ropa" },
    { word: "PARAGUAS",     syllables: ["PA","RA","GUAS"],          emoji: "☂\u{FE0F}", category: "ropa" },

    // ── Música y juego ───────────────────────────────────────
    { word: "GUITARRA",     syllables: ["GUI","TA","RRA"],          emoji: "🎸", category: "musica" },
    { word: "PIANO",        syllables: ["PIA","NO"],                emoji: "🎹", category: "musica" },
    { word: "VIOLÍN",       syllables: ["VIO","LÍN"],               emoji: "🎻", category: "musica" },
    { word: "TROMPETA",     syllables: ["TROM","PE","TA"],          emoji: "🎺", category: "musica" },
    { word: "PELOTA",       syllables: ["PE","LO","TA"],            emoji: "⚽", category: "musica" },
    { word: "DADO",         syllables: ["DA","DO"],                 emoji: "🎲", category: "musica" },
    { word: "PUZLE",        syllables: ["PUZ","LE"],                emoji: "🧩", category: "musica" },
    { word: "GLOBO",        syllables: ["GLO","BO"],                emoji: "🎈", category: "musica" },
    { word: "XILÓFONO",     syllables: ["XI","LÓ","FO","NO"],       emoji: "🎵", category: "musica" },
    { word: "YOYÓ",         syllables: ["YO","YÓ"],                 emoji: "🪀", category: "musica" },

    // ── Otros / fantasía ─────────────────────────────────────
    { word: "DRAGÓN",       syllables: ["DRA","GÓN"],               emoji: "🐉", category: "fantasia" },
    { word: "ROBOT",        syllables: ["RO","BOT"],                emoji: "🤖", category: "fantasia" },
    { word: "FANTASMA",     syllables: ["FAN","TAS","MA"],          emoji: "👻", category: "fantasia" },
    { word: "CALABAZA",     syllables: ["CA","LA","BA","ZA"],       emoji: "🎃", category: "fantasia" },
    { word: "MAGO",         syllables: ["MA","GO"],                 emoji: "🧙", category: "fantasia" },
    { word: "HADA",         syllables: ["HA","DA"],                 emoji: "🧚", category: "fantasia" },
    { word: "REGALO",       syllables: ["RE","GA","LO"],            emoji: "🎁", category: "fantasia" },
    { word: "BANDERA",      syllables: ["BAN","DE","RA"],           emoji: "🚩", category: "fantasia" },
    { word: "MAPA",         syllables: ["MA","PA"],                 emoji: "🗺\u{FE0F}", category: "fantasia" },
    { word: "IMÁN",         syllables: ["I","MÁN"],                 emoji: "🧲", category: "fantasia" },
    { word: "DIAMANTE",     syllables: ["DIA","MAN","TE"],          emoji: "💎", category: "fantasia" },
    { word: "WIFI",         syllables: ["WI","FI"],                 emoji: "📶", category: "fantasia" },
  ];

  // Sanidad: detectar palabras duplicadas (mismo `word`).
  const seen = new Set();
  for (const e of DATA) {
    if (seen.has(e.word)) console.error(`[supeingo:dictionary] palabra duplicada: ${e.word}`);
    seen.add(e.word);
  }

  // Sanidad: cada entrada debe tener al menos una representación gráfica
  // (emoji o svg). Sin esto, el renderer no sabría qué mostrar.
  for (const e of DATA) {
    if (!e.emoji && !e.svg) {
      console.error(`[supeingo:dictionary] ${e.word}: necesita 'emoji' o 'svg'`);
    }
  }

  // Sanidad: la categoría debe estar en el catálogo CATEGORIES.
  for (const e of DATA) {
    if (e.category && !CATEGORIES.has(e.category)) {
      console.error(`[supeingo:dictionary] ${e.word}: categoría desconocida "${e.category}"`);
    }
  }

  // Sanidad: las sílabas deben recomponer la palabra (ignorando acentos
  // y mayúsculas) — protege contra typos del estilo "PLA","TA","NO" para
  // PLÁTANO. Comparamos quitando diacríticos en ambos lados.
  const stripAcc = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const e of DATA) {
    const join = stripAcc(e.syllables.join("")).toUpperCase();
    const word = stripAcc(e.word).toUpperCase();
    if (join !== word) {
      console.error(`[supeingo:dictionary] silabeo no concuerda con palabra: ${e.word} → ${e.syllables.join("·")}`);
    }
  }

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("dictionary", SCHEMA, DATA);

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.dictionary = DATA;
  // Índice por palabra — el patrón que usan los demás ficheros para
  // hidratar referencias sin recorrer el array N veces.
  window.SUPEINGO_CONTENT.dictionaryByWord = Object.fromEntries(
    DATA.map(e => [e.word, e])
  );
  // Índice por categoría — `dictionaryByCategory["animales"]` devuelve
  // el array de entradas de esa categoría. Se construye una vez al
  // cargar; los juegos lo consultan en O(1).
  window.SUPEINGO_CONTENT.dictionaryByCategory = DATA.reduce((acc, e) => {
    if (!acc[e.category]) acc[e.category] = [];
    acc[e.category].push(e);
    return acc;
  }, {});
  window.SUPEINGO_CONTENT.dictionaryCategories = [...CATEGORIES];
})();

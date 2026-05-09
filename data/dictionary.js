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
    },
  };

  // Agrupado por categoría para escanear rápido qué cubrimos. El orden
  // dentro del array no afecta a los juegos: estos buscan por `word`.
  const DATA = [
    // ── Animales ─────────────────────────────────────────────
    { word: "GATO",         syllables: ["GA","TO"],                 emoji: "🐱" },
    { word: "PERRO",        syllables: ["PE","RRO"],                emoji: "🐶" },
    { word: "PATO",         syllables: ["PA","TO"],                 emoji: "🦆" },
    { word: "OSO",          syllables: ["O","SO"],                  emoji: "🐻" },
    { word: "RANA",         syllables: ["RA","NA"],                 emoji: "🐸" },
    { word: "VACA",         syllables: ["VA","CA"],                 emoji: "🐮" },
    { word: "FOCA",         syllables: ["FO","CA"],                 emoji: "🦭" },
    { word: "TORO",         syllables: ["TO","RO"],                 emoji: "🐂" },
    { word: "LOBO",         syllables: ["LO","BO"],                 emoji: "🐺" },
    { word: "ZORRO",        syllables: ["ZO","RRO"],                emoji: "🦊" },
    { word: "MONO",         syllables: ["MO","NO"],                 emoji: "🐵" },
    { word: "PEZ",          syllables: ["PEZ"],                     emoji: "🐟" },
    { word: "GALLINA",      syllables: ["GA","LLI", "NA"],          emoji: "🐔" },
    { word: "GALLO",        syllables: ["GA","LLO"],                emoji: "🐓" },
    { word: "CISNE",        syllables: ["CIS","NE"],                emoji: "🦢" },
    { word: "PANDA",        syllables: ["PAN","DA"],                emoji: "🐼" },
    { word: "KOALA",        syllables: ["KO","A","LA"],             emoji: "🐨" },
    { word: "LEÓN",         syllables: ["LE","ÓN"],                 emoji: "🦁" },
    { word: "BÚHO",         syllables: ["BÚ","HO"],                 emoji: "🦉" },
    { word: "LORO",         syllables: ["LO","RO"],                 emoji: "🦜" },
    { word: "ERIZO",        syllables: ["E","RI","ZO"],             emoji: "🦔" },
    { word: "CABRA",        syllables: ["CA","BRA"],                emoji: "🐐" },
    { word: "OVEJA",        syllables: ["O","VE","JA"],             emoji: "🐑" },
    { word: "TIGRE",        syllables: ["TI","GRE"],                emoji: "🐯" },
    { word: "CERDO",        syllables: ["CER","DO"],                emoji: "🐷" },
    { word: "RATÓN",        syllables: ["RA","TÓN"],                emoji: "🐭" },
    { word: "CABALLO",      syllables: ["CA","BA","LLO"],           emoji: "🐴" },
    { word: "CONEJO",       syllables: ["CO","NE","JO"],            emoji: "🐰" },
    { word: "PULPO",        syllables: ["PUL","PO"],                emoji: "🐙" },
    { word: "CARACOL",      syllables: ["CA","RA","COL"],           emoji: "🐌" },
    { word: "ABEJA",        syllables: ["A","BE","JA"],             emoji: "🐝" },
    { word: "ARAÑA",        syllables: ["A","RA","ÑA"],             emoji: "🕷\u{FE0F}" },
    { word: "HORMIGA",      syllables: ["HOR","MI","GA"],           emoji: "🐜" },
    { word: "POLLITO",      syllables: ["PO","LLI","TO"],           emoji: "🐤" },
    { word: "TORTUGA",      syllables: ["TOR","TU","GA"],           emoji: "🐢" },
    { word: "DELFÍN",       syllables: ["DEL","FÍN"],               emoji: "🐬" },
    { word: "TIBURÓN",      syllables: ["TI","BU","RÓN"],           emoji: "🦈" },
    { word: "BALLENA",      syllables: ["BA","LLE","NA"],           emoji: "🐳" },
    { word: "JIRAFA",       syllables: ["JI","RA","FA"],            emoji: "🦒" },
    { word: "CAMELLO",      syllables: ["CA","ME","LLO"],           emoji: "🐪" },
    { word: "CEBRA",        syllables: ["CE","BRA"],                emoji: "🦓" },
    { word: "LAGARTO",      syllables: ["LA","GAR","TO"],           emoji: "🦎" },
    { word: "DRAGÓN",       syllables: ["DRA","GÓN"],               emoji: "🐉" },
    { word: "SERPIENTE",    syllables: ["SER","PIEN","TE"],         emoji: "🐍" },
    { word: "ELEFANTE",     syllables: ["E","LE","FAN","TE"],       emoji: "🐘" },
    { word: "MURCIÉLAGO",   syllables: ["MUR","CIÉ","LA","GO"],     emoji: "🦇" },
    { word: "PINGÜINO",     syllables: ["PIN","GÜI","NO"],          emoji: "🐧" },
    { word: "COCODRILO",    syllables: ["CO","CO","DRI","LO"],      emoji: "🐊" },
    { word: "MARIPOSA",     syllables: ["MA","RI","PO","SA"],       emoji: "🦋" },

    // ── Frutas y verduras ────────────────────────────────────
    { word: "MANZANA",      syllables: ["MAN","ZA","NA"],           emoji: "🍎", svg: "manzana.svg" },
    { word: "PERA",         syllables: ["PE","RA"],                 emoji: "🍐" },
    { word: "UVA",          syllables: ["U","VA"],                  emoji: "🍇" },
    { word: "FRESA",        syllables: ["FRE","SA"],                emoji: "🍓" },
    { word: "PIÑA",         syllables: ["PI","ÑA"],                 emoji: "🍍" },
    { word: "MANGO",        syllables: ["MAN","GO"],                emoji: "🥭" },
    { word: "COCO",         syllables: ["CO","CO"],                 emoji: "🥥" },
    { word: "KIWI",         syllables: ["KI","WI"],                 emoji: "🥝" },
    { word: "LIMÓN",        syllables: ["LI","MÓN"],                emoji: "🍋" },
    { word: "MELÓN",        syllables: ["ME","LÓN"],                emoji: "🍈" },
    { word: "SANDÍA",       syllables: ["SAN","DÍ","A"],            emoji: "🍉" },
    { word: "NARANJA",      syllables: ["NA","RAN","JA"],           emoji: "🍊" },
    { word: "PLÁTANO",      syllables: ["PLÁ","TA","NO"],           emoji: "🍌" },
    { word: "CEREZA",       syllables: ["CE","RE","ZA"],            emoji: "🍒" },
    { word: "AGUACATE",     syllables: ["A","GUA","CA","TE"],       emoji: "🥑" },
    { word: "TOMATE",       syllables: ["TO","MA","TE"],            emoji: "🍅" },
    { word: "CEBOLLA",      syllables: ["CE","BO","LLA"],           emoji: "🧅" },
    { word: "AJO",          syllables: ["A","JO"],                  emoji: "🧄" },
    { word: "PATATA",       syllables: ["PA","TA","TA"],            emoji: "🥔" },
    { word: "ZANAHORIA",    syllables: ["ZA","NA","HO","RIA"],      emoji: "🥕" },
    { word: "MAÍZ",         syllables: ["MA","ÍZ"],                 emoji: "🌽" },
    { word: "LECHUGA",      syllables: ["LE","CHU","GA"],           emoji: "🥬" },
    { word: "PEPINO",       syllables: ["PE","PI","NO"],            emoji: "🥒" },
    { word: "BRÓCOLI",      syllables: ["BRÓ","CO","LI"],           emoji: "🥦" },
    { word: "BERENJENA",    syllables: ["BE","REN","JE","NA"],      emoji: "🍆" },
    { word: "PIMIENTO",     syllables: ["PI","MIEN","TO"],          emoji: "🫑" },
    { word: "SETA",         syllables: ["SE","TA"],                 emoji: "🍄" },

    // ── Comida y bebidas ─────────────────────────────────────
    { word: "PAN",          syllables: ["PAN"],                     emoji: "🍞" },
    { word: "QUESO",        syllables: ["QUE","SO"],                emoji: "🧀" },
    { word: "HUEVO",        syllables: ["HUE","VO"],                emoji: "🥚" },
    { word: "LECHE",        syllables: ["LE","CHE"],                emoji: "🥛" },
    { word: "MIEL",         syllables: ["MIEL"],                    emoji: "🍯" },
    { word: "TARTA",        syllables: ["TAR","TA"],                emoji: "🎂" },
    { word: "HELADO",       syllables: ["HE","LA","DO"],            emoji: "🍦" },
    { word: "GALLETA",      syllables: ["GA","LLE","TA"],           emoji: "🍪" },
    { word: "CHOCOLATE",    syllables: ["CHO","CO","LA","TE"],      emoji: "🍫" },
    { word: "HAMBURGUESA",  syllables: ["HAM","BUR","GUE","SA"],    emoji: "🍔" },
    { word: "TACO",         syllables: ["TA","CO"],                 emoji: "🌮" },
    { word: "PALOMITAS",    syllables: ["PA","LO","MI","TAS"],      emoji: "🍿" },
    { word: "TÉ",           syllables: ["TÉ"],                      emoji: "🍵" },

    // ── Hogar y objetos ──────────────────────────────────────
    { word: "CASA",         syllables: ["CA","SA"],                 emoji: "🏠" },
    { word: "SILLA",        syllables: ["SI","LLA"],                emoji: "🪑" },
    { word: "CAMA",         syllables: ["CA","MA"],                 emoji: "🛏\u{FE0F}" },
    { word: "SOFÁ",         syllables: ["SO","FÁ"],                 emoji: "🛋\u{FE0F}" },
    { word: "PUERTA",       syllables: ["PUER","TA"],               emoji: "🚪" },
    { word: "LLAVE",        syllables: ["LLA","VE"],                emoji: "🔑" },
    { word: "VENTANA",      syllables: ["VEN","TA","NA"],           emoji: "🪟" },
    { word: "LIBRO",        syllables: ["LI","BRO"],                emoji: "📕" },
    { word: "LÁPIZ",        syllables: ["LÁ","PIZ"],                emoji: "✏\u{FE0F}" },
    { word: "REGLA",        syllables: ["RE","GLA"],                emoji: "📏" },
    { word: "RELOJ",        syllables: ["RE","LOJ"],                emoji: "⏰" },
    { word: "TIJERAS",      syllables: ["TI","JE","RAS"],           emoji: "✂\u{FE0F}" },
    { word: "MARTILLO",     syllables: ["MAR","TI","LLO"],          emoji: "🔨" },
    { word: "ESCOBA",       syllables: ["ES","CO","BA"],            emoji: "🧹" },
    { word: "JABÓN",        syllables: ["JA","BÓN"],                emoji: "🧼" },
    { word: "ESPONJA",      syllables: ["ES","PON","JA"],           emoji: "🧽" },
    { word: "BOMBILLA",     syllables: ["BOM","BI","LLA"],          emoji: "💡" },
    { word: "VELA",         syllables: ["VE","LA"],                 emoji: "🕯\u{FE0F}" },
    { word: "TELÉFONO",     syllables: ["TE","LÉ","FO","NO"],       emoji: "📱" },
    { word: "CÁMARA",       syllables: ["CÁ","MA","RA"],            emoji: "📷" },

    // ── Naturaleza y clima ───────────────────────────────────
    { word: "SOL",          syllables: ["SOL"],                     emoji: "☀\u{FE0F}" },
    { word: "LUNA",         syllables: ["LU","NA"],                 emoji: "🌙" },
    { word: "ESTRELLA",     syllables: ["ES","TRE","LLA"],          emoji: "⭐" },
    { word: "NUBE",         syllables: ["NU","BE"],                 emoji: "☁\u{FE0F}" },
    { word: "LLUVIA",       syllables: ["LLU","VIA"],               emoji: "🌧\u{FE0F}" },
    { word: "NIEVE",        syllables: ["NIE","VE"],                emoji: "❄\u{FE0F}" },
    { word: "RAYO",         syllables: ["RA","YO"],                 emoji: "⚡" },
    { word: "ARCOÍRIS",     syllables: ["AR","CO","Í","RIS"],       emoji: "🌈" },
    { word: "FLOR",         syllables: ["FLOR"],                    emoji: "🌸" },
    { word: "ROSA",         syllables: ["RO","SA"],                 emoji: "🌹" },
    { word: "HOJA",         syllables: ["HO","JA"],                 emoji: "🍃" },
    { word: "ÁRBOL",        syllables: ["ÁR","BOL"],                emoji: "🌳" },
    { word: "PALMERA",      syllables: ["PAL","ME","RA"],           emoji: "🌴" },
    { word: "CACTUS",       syllables: ["CAC","TUS"],               emoji: "🌵" },
    { word: "FUEGO",        syllables: ["FUE","GO"],                emoji: "🔥" },
    { word: "AGUA",         syllables: ["A","GUA"],                 emoji: "💧" },
    { word: "MAR",          syllables: ["MAR"],                     emoji: "🌊" },
    { word: "MONTAÑA",      syllables: ["MON","TA","ÑA"],           emoji: "⛰\u{FE0F}" },
    { word: "VOLCÁN",       syllables: ["VOL","CÁN"],               emoji: "🌋" },
    { word: "PLAYA",        syllables: ["PLA","YA"],                emoji: "🏖\u{FE0F}" },
    { word: "ISLA",         syllables: ["IS","LA"],                 emoji: "🏝\u{FE0F}" },
    { word: "TIERRA",       syllables: ["TIE","RRA"],               emoji: "🌍" },
    { word: "PIEDRA",       syllables: ["PIE","DRA"],               emoji: "🪨" },

    // ── Cuerpo ───────────────────────────────────────────────
    { word: "OJO",          syllables: ["O","JO"],                  emoji: "👁\u{FE0F}" },
    { word: "BOCA",         syllables: ["BO","CA"],                 emoji: "👄" },
    { word: "OREJA",        syllables: ["O","RE","JA"],             emoji: "👂" },
    { word: "NARIZ",        syllables: ["NA","RIZ"],                emoji: "👃" },
    { word: "MANO",         syllables: ["MA","NO"],                 emoji: "✋" },
    { word: "DEDO",         syllables: ["DE","DO"],                 emoji: "👆" },
    { word: "PIE",          syllables: ["PIE"],                     emoji: "🦶" },
    { word: "PIERNA",       syllables: ["PIER","NA"],               emoji: "🦵" },
    { word: "BRAZO",        syllables: ["BRA","ZO"],                emoji: "💪" },
    { word: "DIENTE",       syllables: ["DIEN","TE"],               emoji: "🦷" },
    { word: "HUESO",        syllables: ["HUE","SO"],                emoji: "🦴" },
    { word: "LENGUA",       syllables: ["LEN","GUA"],               emoji: "👅" },

    // ── Transporte ───────────────────────────────────────────
    { word: "COCHE",        syllables: ["CO","CHE"],                emoji: "🚗" },
    { word: "MOTO",         syllables: ["MO","TO"],                 emoji: "🏍\u{FE0F}" },
    { word: "BICI",         syllables: ["BI","CI"],                 emoji: "🚲" },
    { word: "AUTOBÚS",      syllables: ["AU","TO","BÚS"],           emoji: "🚌" },
    { word: "CAMIÓN",       syllables: ["CA","MIÓN"],               emoji: "🚚" },
    { word: "TRACTOR",      syllables: ["TRAC","TOR"],              emoji: "🚜" },
    { word: "TREN",         syllables: ["TREN"],                    emoji: "🚂" },
    { word: "AVIÓN",        syllables: ["A","VIÓN"],                emoji: "✈\u{FE0F}" },
    { word: "BARCO",        syllables: ["BAR","CO"],                emoji: "⛵" },
    { word: "COHETE",       syllables: ["CO","HE","TE"],            emoji: "🚀" },
    { word: "HELICÓPTERO",  syllables: ["HE","LI","CÓP","TE","RO"], emoji: "🚁" },

    // ── Ropa y accesorios ────────────────────────────────────
    { word: "ZAPATO",       syllables: ["ZA","PA","TO"],            emoji: "👞" },
    { word: "BOTA",         syllables: ["BO","TA"],                 emoji: "👢" },
    { word: "CALCETÍN",     syllables: ["CAL","CE","TÍN"],          emoji: "🧦" },
    { word: "GUANTE",       syllables: ["GUAN","TE"],               emoji: "🧤" },
    { word: "BUFANDA",      syllables: ["BU","FAN","DA"],           emoji: "🧣" },
    { word: "VESTIDO",      syllables: ["VES","TI","DO"],           emoji: "👗" },
    { word: "GAFAS",        syllables: ["GA","FAS"],                emoji: "👓" },
    { word: "GORRA",        syllables: ["GO","RRA"],                emoji: "🧢" },
    { word: "SOMBRERO",     syllables: ["SOM","BRE","RO"],          emoji: "🎩" },
    { word: "CORONA",       syllables: ["CO","RO","NA"],            emoji: "👑" },
    { word: "ANILLO",       syllables: ["A","NI","LLO"],            emoji: "💍" },
    { word: "MOCHILA",      syllables: ["MO","CHI","LA"],           emoji: "🎒" },
    { word: "BOLSO",        syllables: ["BOL","SO"],                emoji: "👜" },
    { word: "PARAGUAS",     syllables: ["PA","RA","GUAS"],          emoji: "☂\u{FE0F}" },

    // ── Música y juego ───────────────────────────────────────
    { word: "GUITARRA",     syllables: ["GUI","TA","RRA"],          emoji: "🎸" },
    { word: "PIANO",        syllables: ["PIA","NO"],                emoji: "🎹" },
    { word: "VIOLÍN",       syllables: ["VIO","LÍN"],               emoji: "🎻" },
    { word: "TROMPETA",     syllables: ["TROM","PE","TA"],          emoji: "🎺" },
    { word: "PELOTA",       syllables: ["PE","LO","TA"],            emoji: "⚽" },
    { word: "DADO",         syllables: ["DA","DO"],                 emoji: "🎲" },
    { word: "PUZLE",        syllables: ["PUZ","LE"],                emoji: "🧩" },
    { word: "GLOBO",        syllables: ["GLO","BO"],                emoji: "🎈" },
    { word: "XILÓFONO",     syllables: ["XI","LÓ","FO","NO"],       emoji: "🎵" },
    { word: "YOYÓ",         syllables: ["YO","YÓ"],                 emoji: "🪀" },

    // ── Otros / fantasía ─────────────────────────────────────
    { word: "ROBOT",        syllables: ["RO","BOT"],                emoji: "🤖" },
    { word: "FANTASMA",     syllables: ["FAN","TAS","MA"],          emoji: "👻" },
    { word: "CALABAZA",     syllables: ["CA","LA","BA","ZA"],       emoji: "🎃" },
    { word: "MAGO",         syllables: ["MA","GO"],                 emoji: "🧙" },
    { word: "HADA",         syllables: ["HA","DA"],                 emoji: "🧚" },
    { word: "REGALO",       syllables: ["RE","GA","LO"],            emoji: "🎁" },
    { word: "BANDERA",      syllables: ["BAN","DE","RA"],           emoji: "🚩" },
    { word: "MAPA",         syllables: ["MA","PA"],                 emoji: "🗺\u{FE0F}" },
    { word: "IMÁN",         syllables: ["I","MÁN"],                 emoji: "🧲" },
    { word: "DIAMANTE",     syllables: ["DIA","MAN","TE"],          emoji: "💎" },
    { word: "WIFI",         syllables: ["WI","FI"],                 emoji: "📶" },
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
})();

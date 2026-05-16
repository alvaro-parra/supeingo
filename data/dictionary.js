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
      // Representación gráfica:
      //  - `image`: ruta+extensión relativa a assets/, p.ej. "img/jamon.webp".
      //    Soporta cualquier formato (png/webp/svg/…).
      //  - `emoji`: fallback unicode si no hay imagen.
      // `image` tiene prioridad sobre `emoji`. Ambos opcionales a nivel
      // de schema, pero AL MENOS UNO debe estar presente — se comprueba
      // abajo con un check custom.
      emoji:     { type: "string", required: false },
      image:     { type: "string", required: false },
      // Categorías a las que pertenece la palabra. Sirve a juegos que
      // agrupan visualmente (FindPicture/Memory mezclan entradas dentro
      // del mismo grupo) y a la pista de categoría de GuessWord. Una
      // palabra puede pertenecer a varias (p.ej. SANDÍA podría ser
      // "vegetales" + "comida") o a ninguna (p.ej. juguetes sueltos
      // que no encajan en ningún grupo). Cada nombre debe estar en el
      // catálogo CATEGORIES de abajo.
      categories: { type: "array", of: { type: "string" }, required: false },
      // Etiquetas ortogonales a las categorías. "miedo" marca palabras
      // que pueden asustar a peques (araña, serpiente, murciélago,…). El
      // ajuste "Ocultar palabras que dan miedo" filtra estas entradas
      // del pool de los juegos. Cada tag debe estar en el catálogo TAGS.
      tags:      { type: "array", of: { type: "string" }, required: false },
    },
  };

  // Catálogo de tags reconocidos.
  const TAGS = new Set([
    "miedo",

  ]);

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
    { word: "GATO",         syllables: ["GA","TO"],                 emoji: "🐱", categories: ["animales"] },
    { word: "PERRO",        syllables: ["PE","RRO"],                emoji: "🐶", categories: ["animales"] },
    { word: "PATO",         syllables: ["PA","TO"],                 emoji: "🦆", categories: ["animales"] },
    { word: "OSO",          syllables: ["O","SO"],                  emoji: "🐻", categories: ["animales"] },
    { word: "RANA",         syllables: ["RA","NA"],                 emoji: "🐸", categories: ["animales"] },
    { word: "VACA",         syllables: ["VA","CA"],                 emoji: "🐮", categories: ["animales"] },
    { word: "FOCA",         syllables: ["FO","CA"],                 emoji: "🦭", categories: ["animales"] },
    { word: "TORO",         syllables: ["TO","RO"],                 emoji: "🐂", categories: ["animales"] },
    { word: "LOBO",         syllables: ["LO","BO"],                 emoji: "🐺", categories: ["animales"], tags: ["miedo"] },
    { word: "ZORRO",        syllables: ["ZO","RRO"],                emoji: "🦊", categories: ["animales"] },
    { word: "MONO",         syllables: ["MO","NO"],                 emoji: "🐵", categories: ["animales"] },
    { word: "PEZ",          syllables: ["PEZ"],                     emoji: "🐟", categories: ["animales"] },
    { word: "GALLINA",      syllables: ["GA","LLI", "NA"],          emoji: "🐔", categories: ["animales"] },
    { word: "GALLO",        syllables: ["GA","LLO"],                emoji: "🐓", categories: ["animales"] },
    { word: "CISNE",        syllables: ["CIS","NE"],                emoji: "🦢", categories: ["animales"] },
    { word: "PANDA",        syllables: ["PAN","DA"],                emoji: "🐼", categories: ["animales"] },
    { word: "KOALA",        syllables: ["KO","A","LA"],             emoji: "🐨", categories: ["animales"] },
    { word: "LEÓN",         syllables: ["LE","ÓN"],                 emoji: "🦁", categories: ["animales"] },
    { word: "BÚHO",         syllables: ["BÚ","HO"],                 emoji: "🦉", categories: ["animales"] },
    { word: "LORO",         syllables: ["LO","RO"],                 emoji: "🦜", categories: ["animales"] },
    { word: "ERIZO",        syllables: ["E","RI","ZO"],             emoji: "🦔", categories: ["animales"] },
    { word: "CABRA",        syllables: ["CA","BRA"],                emoji: "🐐", categories: ["animales"] },
    { word: "OVEJA",        syllables: ["O","VE","JA"],             emoji: "🐑", categories: ["animales"] },
    { word: "TIGRE",        syllables: ["TI","GRE"],                emoji: "🐯", categories: ["animales"] },
    { word: "CERDO",        syllables: ["CER","DO"],                emoji: "🐷", categories: ["animales"] },
    { word: "RATÓN",        syllables: ["RA","TÓN"],                emoji: "🐭", categories: ["animales"], tags: ["miedo"] },
    { word: "CABALLO",      syllables: ["CA","BA","LLO"],           emoji: "🐴", categories: ["animales"] },
    { word: "CONEJO",       syllables: ["CO","NE","JO"],            emoji: "🐰", categories: ["animales"] },
    { word: "PULPO",        syllables: ["PUL","PO"],                emoji: "🐙", categories: ["animales"] },
    { word: "CARACOL",      syllables: ["CA","RA","COL"],           emoji: "🐌", categories: ["animales"] },
    { word: "ABEJA",        syllables: ["A","BE","JA"],             emoji: "🐝", categories: ["animales"] },
    { word: "ARAÑA",        syllables: ["A","RA","ÑA"],             emoji: "🕷\u{FE0F}", categories: ["animales"], tags: ["miedo"] },
    { word: "HORMIGA",      syllables: ["HOR","MI","GA"],           emoji: "🐜", categories: ["animales"] },
    { word: "POLLITO",      syllables: ["PO","LLI","TO"],           emoji: "🐤", categories: ["animales"] },
    { word: "TORTUGA",      syllables: ["TOR","TU","GA"],           emoji: "🐢", categories: ["animales"] },
    { word: "DELFÍN",       syllables: ["DEL","FÍN"],               emoji: "🐬", categories: ["animales"] },
    { word: "TIBURÓN",      syllables: ["TI","BU","RÓN"],           emoji: "🦈", categories: ["animales"], tags: ["miedo"] },
    { word: "BALLENA",      syllables: ["BA","LLE","NA"],           emoji: "🐳", categories: ["animales"] },
    { word: "JIRAFA",       syllables: ["JI","RA","FA"],            emoji: "🦒", categories: ["animales"] },
    { word: "CAMELLO",      syllables: ["CA","ME","LLO"],           emoji: "🐪", categories: ["animales"] },
    { word: "CEBRA",        syllables: ["CE","BRA"],                emoji: "🦓", categories: ["animales"] },
    { word: "LAGARTO",      syllables: ["LA","GAR","TO"],           emoji: "🦎", categories: ["animales"], tags: ["miedo"] },
    { word: "SERPIENTE",    syllables: ["SER","PIEN","TE"],         emoji: "🐍", categories: ["animales"], tags: ["miedo"] },
    { word: "ELEFANTE",     syllables: ["E","LE","FAN","TE"],       emoji: "🐘", categories: ["animales"] },
    { word: "MURCIÉLAGO",   syllables: ["MUR","CIÉ","LA","GO"],     emoji: "🦇", categories: ["animales"], tags: ["miedo"] },
    { word: "PINGÜINO",     syllables: ["PIN","GÜI","NO"],          emoji: "🐧", categories: ["animales"] },
    { word: "COCODRILO",    syllables: ["CO","CO","DRI","LO"],      emoji: "🐊", categories: ["animales"], tags: ["miedo"] },
    { word: "MARIPOSA",     syllables: ["MA","RI","PO","SA"],       emoji: "🦋", categories: ["animales"] },

    // ── Frutas y verduras ────────────────────────────────────
    { word: "MANZANA",      syllables: ["MAN","ZA","NA"],           emoji: "🍎", categories: ["vegetales"] },
    { word: "PERA",         syllables: ["PE","RA"],                 emoji: "🍐", categories: ["vegetales"] },
    { word: "UVA",          syllables: ["U","VA"],                  emoji: "🍇", categories: ["vegetales"] },
    { word: "FRESA",        syllables: ["FRE","SA"],                emoji: "🍓", categories: ["vegetales"] },
    { word: "PIÑA",         syllables: ["PI","ÑA"],                 emoji: "🍍", categories: ["vegetales"] },
    { word: "MANGO",        syllables: ["MAN","GO"],                emoji: "🥭", categories: ["vegetales"] },
    { word: "COCO",         syllables: ["CO","CO"],                 emoji: "🥥", categories: ["vegetales"] },
    { word: "KIWI",         syllables: ["KI","WI"],                 emoji: "🥝", categories: ["vegetales"] },
    { word: "LIMÓN",        syllables: ["LI","MÓN"],                emoji: "🍋", categories: ["vegetales"] },
    { word: "MELÓN",        syllables: ["ME","LÓN"],                emoji: "🍈", categories: ["vegetales"] },
    { word: "SANDÍA",       syllables: ["SAN","DÍ","A"],            emoji: "🍉", categories: ["vegetales"] },
    { word: "NARANJA",      syllables: ["NA","RAN","JA"],           emoji: "🍊", categories: ["vegetales"] },
    { word: "PLÁTANO",      syllables: ["PLÁ","TA","NO"],           emoji: "🍌", categories: ["vegetales"] },
    { word: "CEREZA",       syllables: ["CE","RE","ZA"],            emoji: "🍒", categories: ["vegetales"] },
    { word: "AGUACATE",     syllables: ["A","GUA","CA","TE"],       emoji: "🥑", categories: ["vegetales"] },
    { word: "TOMATE",       syllables: ["TO","MA","TE"],            emoji: "🍅", categories: ["vegetales"] },
    { word: "CEBOLLA",      syllables: ["CE","BO","LLA"],           emoji: "🧅", categories: ["vegetales"] },
    { word: "AJO",          syllables: ["A","JO"],                  emoji: "🧄", categories: ["vegetales"] },
    { word: "PATATA",       syllables: ["PA","TA","TA"],            emoji: "🥔", categories: ["vegetales"] },
    { word: "ZANAHORIA",    syllables: ["ZA","NA","HO","RIA"],      emoji: "🥕", categories: ["vegetales"] },
    { word: "MAÍZ",         syllables: ["MA","ÍZ"],                 emoji: "🌽", categories: ["vegetales"] },
    { word: "LECHUGA",      syllables: ["LE","CHU","GA"],           emoji: "🥬", categories: ["vegetales"] },
    { word: "PEPINO",       syllables: ["PE","PI","NO"],            emoji: "🥒", categories: ["vegetales"] },
    { word: "BRÓCOLI",      syllables: ["BRÓ","CO","LI"],           emoji: "🥦", categories: ["vegetales"] },
    { word: "BERENJENA",    syllables: ["BE","REN","JE","NA"],      emoji: "🍆", categories: ["vegetales"] },
    { word: "PIMIENTO",     syllables: ["PI","MIEN","TO"],          emoji: "🫑", categories: ["vegetales"] },
    { word: "SETA",         syllables: ["SE","TA"],                 emoji: "🍄", categories: ["vegetales"] },

    // ── Comida y bebidas ─────────────────────────────────────
    { word: "PAN",          syllables: ["PAN"],                     emoji: "🍞", categories: ["comida"] },
    { word: "QUESO",        syllables: ["QUE","SO"],                emoji: "🧀", categories: ["comida"] },
    { word: "JAMÓN",        syllables: ["JA","MÓN"],                image: "img/jamon.webp", categories: ["comida"] },
    { word: "HUEVO",        syllables: ["HUE","VO"],                emoji: "🥚", categories: ["comida"] },
    { word: "LECHE",        syllables: ["LE","CHE"],                emoji: "🥛", categories: ["comida"] },
    { word: "MIEL",         syllables: ["MIEL"],                    emoji: "🍯", categories: ["comida"] },
    { word: "TARTA",        syllables: ["TAR","TA"],                emoji: "🎂", categories: ["comida"] },
    { word: "HELADO",       syllables: ["HE","LA","DO"],            emoji: "🍦", categories: ["comida"] },
    { word: "GALLETA",      syllables: ["GA","LLE","TA"],           emoji: "🍪", categories: ["comida"] },
    { word: "CHOCOLATE",    syllables: ["CHO","CO","LA","TE"],      emoji: "🍫", categories: ["comida"] },
    { word: "HAMBURGUESA",  syllables: ["HAM","BUR","GUE","SA"],    emoji: "🍔", categories: ["comida"] },
    { word: "TACO",         syllables: ["TA","CO"],                 emoji: "🌮", categories: ["comida"] },
    { word: "PALOMITAS",    syllables: ["PA","LO","MI","TAS"],      emoji: "🍿", categories: ["comida"] },
    { word: "TÉ",           syllables: ["TÉ"],                      emoji: "🍵", categories: ["comida"] },

    // ── Hogar y objetos ──────────────────────────────────────
    { word: "CASA",         syllables: ["CA","SA"],                 emoji: "🏠", categories: ["hogar"] },
    { word: "SILLA",        syllables: ["SI","LLA"],                emoji: "🪑", categories: ["hogar"] },
    { word: "CAMA",         syllables: ["CA","MA"],                 emoji: "🛏\u{FE0F}", categories: ["hogar"] },
    { word: "SOFÁ",         syllables: ["SO","FÁ"],                 emoji: "🛋\u{FE0F}", categories: ["hogar"] },
    { word: "PUERTA",       syllables: ["PUER","TA"],               emoji: "🚪", categories: ["hogar"] },
    { word: "LLAVE",        syllables: ["LLA","VE"],                emoji: "🔑", categories: ["hogar"] },
    { word: "VENTANA",      syllables: ["VEN","TA","NA"],           emoji: "🪟", categories: ["hogar"] },
    { word: "LIBRO",        syllables: ["LI","BRO"],                emoji: "📕", categories: ["hogar"] },
    { word: "LÁPIZ",        syllables: ["LÁ","PIZ"],                emoji: "✏\u{FE0F}", categories: ["hogar"] },
    { word: "REGLA",        syllables: ["RE","GLA"],                emoji: "📏", categories: ["hogar"] },
    { word: "RELOJ",        syllables: ["RE","LOJ"],                emoji: "⏰", categories: ["hogar"] },
    { word: "TIJERAS",      syllables: ["TI","JE","RAS"],           emoji: "✂\u{FE0F}", categories: ["hogar"] },
    { word: "MARTILLO",     syllables: ["MAR","TI","LLO"],          emoji: "🔨", categories: ["hogar"] },
    { word: "ESCOBA",       syllables: ["ES","CO","BA"],            emoji: "🧹", categories: ["hogar"] },
    { word: "JABÓN",        syllables: ["JA","BÓN"],                emoji: "🧼", categories: ["hogar"] },
    { word: "ESPONJA",      syllables: ["ES","PON","JA"],           emoji: "🧽", categories: ["hogar"] },
    { word: "BOMBILLA",     syllables: ["BOM","BI","LLA"],          emoji: "💡", categories: ["hogar"] },
    { word: "VELA",         syllables: ["VE","LA"],                 emoji: "🕯\u{FE0F}", categories: ["hogar"] },
    { word: "TELÉFONO",     syllables: ["TE","LÉ","FO","NO"],       emoji: "📱", categories: ["hogar"] },
    { word: "CÁMARA",       syllables: ["CÁ","MA","RA"],            emoji: "📷", categories: ["hogar"] },

    // ── Naturaleza y clima ───────────────────────────────────
    { word: "SOL",          syllables: ["SOL"],                     emoji: "☀\u{FE0F}", categories: ["naturaleza"] },
    { word: "LUNA",         syllables: ["LU","NA"],                 emoji: "🌙", categories: ["naturaleza"] },
    { word: "ESTRELLA",     syllables: ["ES","TRE","LLA"],          emoji: "⭐", categories: ["naturaleza"] },
    { word: "NUBE",         syllables: ["NU","BE"],                 emoji: "☁\u{FE0F}", categories: ["naturaleza"] },
    { word: "LLUVIA",       syllables: ["LLU","VIA"],               emoji: "🌧\u{FE0F}", categories: ["naturaleza"] },
    { word: "NIEVE",        syllables: ["NIE","VE"],                emoji: "❄\u{FE0F}", categories: ["naturaleza"] },
    { word: "RAYO",         syllables: ["RA","YO"],                 emoji: "⚡", categories: ["naturaleza"] },
    { word: "ARCOÍRIS",     syllables: ["AR","CO","Í","RIS"],       emoji: "🌈", categories: ["naturaleza"] },
    { word: "FLOR",         syllables: ["FLOR"],                    emoji: "🌸", categories: ["naturaleza"] },
    { word: "ROSA",         syllables: ["RO","SA"],                 emoji: "🌹", categories: ["naturaleza"] },
    { word: "HOJA",         syllables: ["HO","JA"],                 emoji: "🍃", categories: ["naturaleza"] },
    { word: "ÁRBOL",        syllables: ["ÁR","BOL"],                emoji: "🌳", categories: ["naturaleza"] },
    { word: "PALMERA",      syllables: ["PAL","ME","RA"],           emoji: "🌴", categories: ["naturaleza"] },
    { word: "CACTUS",       syllables: ["CAC","TUS"],               emoji: "🌵", categories: ["naturaleza"] },
    { word: "FUEGO",        syllables: ["FUE","GO"],                emoji: "🔥", categories: ["naturaleza"] },
    { word: "AGUA",         syllables: ["A","GUA"],                 emoji: "💧", categories: ["naturaleza"] },
    { word: "MAR",          syllables: ["MAR"],                     emoji: "🌊", categories: ["naturaleza"] },
    { word: "MONTAÑA",      syllables: ["MON","TA","ÑA"],           emoji: "⛰\u{FE0F}", categories: ["naturaleza"] },
    { word: "VOLCÁN",       syllables: ["VOL","CÁN"],               emoji: "🌋", categories: ["naturaleza"], tags: ["miedo"] },
    { word: "PLAYA",        syllables: ["PLA","YA"],                emoji: "🏖\u{FE0F}", categories: ["naturaleza"] },
    { word: "ISLA",         syllables: ["IS","LA"],                 emoji: "🏝\u{FE0F}", categories: ["naturaleza"] },
    { word: "TIERRA",       syllables: ["TIE","RRA"],               emoji: "🌍", categories: ["naturaleza"] },
    { word: "PIEDRA",       syllables: ["PIE","DRA"],               emoji: "🪨", categories: ["naturaleza"] },

    // ── Cuerpo ───────────────────────────────────────────────
    { word: "OJO",          syllables: ["O","JO"],                  emoji: "👁\u{FE0F}", categories: ["cuerpo"] },
    { word: "BOCA",         syllables: ["BO","CA"],                 emoji: "👄", categories: ["cuerpo"] },
    { word: "OREJA",        syllables: ["O","RE","JA"],             emoji: "👂", categories: ["cuerpo"] },
    { word: "NARIZ",        syllables: ["NA","RIZ"],                emoji: "👃", categories: ["cuerpo"] },
    { word: "MANO",         syllables: ["MA","NO"],                 emoji: "✋", categories: ["cuerpo"] },
    { word: "DEDO",         syllables: ["DE","DO"],                 emoji: "👆", categories: ["cuerpo"] },
    { word: "PIE",          syllables: ["PIE"],                     emoji: "🦶", categories: ["cuerpo"] },
    { word: "PIERNA",       syllables: ["PIER","NA"],               emoji: "🦵", categories: ["cuerpo"] },
    { word: "BRAZO",        syllables: ["BRA","ZO"],                emoji: "💪", categories: ["cuerpo"] },
    { word: "DIENTE",       syllables: ["DIEN","TE"],               emoji: "🦷", categories: ["cuerpo"] },
    { word: "HUESO",        syllables: ["HUE","SO"],                emoji: "🦴", categories: ["cuerpo"] },
    { word: "LENGUA",       syllables: ["LEN","GUA"],               emoji: "👅", categories: ["cuerpo"] },

    // ── Transporte ───────────────────────────────────────────
    { word: "COCHE",        syllables: ["CO","CHE"],                emoji: "🚗", categories: ["transporte"] },
    { word: "MOTO",         syllables: ["MO","TO"],                 emoji: "🏍\u{FE0F}", categories: ["transporte"] },
    { word: "BICI",         syllables: ["BI","CI"],                 emoji: "🚲", categories: ["transporte"] },
    { word: "TAXI",         syllables: ["TA","XI"],                 emoji: "🚕", categories: ["transporte"] },
    { word: "AUTOBÚS",      syllables: ["AU","TO","BÚS"],           emoji: "🚌", categories: ["transporte"] },
    { word: "CAMIÓN",       syllables: ["CA","MIÓN"],               emoji: "🚚", categories: ["transporte"] },
    { word: "TRACTOR",      syllables: ["TRAC","TOR"],              emoji: "🚜", categories: ["transporte"] },
    { word: "TREN",         syllables: ["TREN"],                    emoji: "🚂", categories: ["transporte"] },
    { word: "AVIÓN",        syllables: ["A","VIÓN"],                emoji: "✈\u{FE0F}", categories: ["transporte"] },
    { word: "BARCO",        syllables: ["BAR","CO"],                emoji: "⛵", categories: ["transporte"] },
    { word: "COHETE",       syllables: ["CO","HE","TE"],            emoji: "🚀", categories: ["transporte"] },
    { word: "HELICÓPTERO",  syllables: ["HE","LI","CÓP","TE","RO"], emoji: "🚁", categories: ["transporte"] },

    // ── Ropa y accesorios ────────────────────────────────────
    { word: "ZAPATO",       syllables: ["ZA","PA","TO"],            emoji: "👞", categories: ["ropa"] },
    { word: "BOTA",         syllables: ["BO","TA"],                 emoji: "👢", categories: ["ropa"] },
    { word: "CALCETÍN",     syllables: ["CAL","CE","TÍN"],          emoji: "🧦", categories: ["ropa"] },
    { word: "GUANTE",       syllables: ["GUAN","TE"],               emoji: "🧤", categories: ["ropa"] },
    { word: "BUFANDA",      syllables: ["BU","FAN","DA"],           emoji: "🧣", categories: ["ropa"] },
    { word: "VESTIDO",      syllables: ["VES","TI","DO"],           emoji: "👗", categories: ["ropa"] },
    { word: "GAFAS",        syllables: ["GA","FAS"],                emoji: "👓", categories: ["ropa"] },
    { word: "GORRA",        syllables: ["GO","RRA"],                emoji: "🧢", categories: ["ropa"] },
    { word: "SOMBRERO",     syllables: ["SOM","BRE","RO"],          emoji: "🎩", categories: ["ropa"] },
    { word: "CORONA",       syllables: ["CO","RO","NA"],            emoji: "👑", categories: ["ropa"] },
    { word: "ANILLO",       syllables: ["A","NI","LLO"],            emoji: "💍", categories: ["ropa"] },
    { word: "MOCHILA",      syllables: ["MO","CHI","LA"],           emoji: "🎒", categories: ["ropa"] },
    { word: "BOLSO",        syllables: ["BOL","SO"],                emoji: "👜", categories: ["ropa"] },
    { word: "PARAGUAS",     syllables: ["PA","RA","GUAS"],          emoji: "☂\u{FE0F}", categories: ["ropa"] },
    { word: "JERSEY",       syllables: ["JER","SEY"],               image: "img/jersey.webp", categories: ["ropa"] },

    // ── Música ───────────────────────────────────────────────
    { word: "GUITARRA",     syllables: ["GUI","TA","RRA"],          emoji: "🎸", categories: ["musica"] },
    { word: "PIANO",        syllables: ["PIA","NO"],                emoji: "🎹", categories: ["musica"] },
    { word: "VIOLÍN",       syllables: ["VIO","LÍN"],               emoji: "🎻", categories: ["musica"] },
    { word: "TROMPETA",     syllables: ["TROM","PE","TA"],          emoji: "🎺", categories: ["musica"] },
    { word: "XILÓFONO",     syllables: ["XI","LÓ","FO","NO"],       emoji: "🎵", categories: ["musica"] },
    { word: "MICRÓFONO",    syllables: ["MI","CRÓ","FO","NO"],      emoji: "🎤", categories: ["musica"] },
    { word: "MÚSICA",       syllables: ["MÚ","SI","CA"],            emoji: "🎶", categories: ["musica"] },

    // ── Juguetes ─────────────────────────────────────────────
    // Sin categoría: hoy ningún juego filtra por "juguetes". Cuando
    // queramos un juego de juguetes, añadimos la categoría aquí y al
    // catálogo CATEGORIES. De momento estas palabras existen para
    // WordBuilder y similares (que no filtran por categoría).
    { word: "PELOTA",       syllables: ["PE","LO","TA"],            emoji: "⚽" },
    { word: "DADO",         syllables: ["DA","DO"],                 emoji: "🎲" },
    { word: "PUZLE",        syllables: ["PUZ","LE"],                emoji: "🧩" },
    { word: "GLOBO",        syllables: ["GLO","BO"],                emoji: "🎈" },
    { word: "YOYÓ",         syllables: ["YO","YÓ"],                 emoji: "🪀" },
    { word: "JUGUETE",      syllables: ["JU","GUE","TE"],           image: "img/juguete.webp" },

    // ── Otros / fantasía ─────────────────────────────────────
    { word: "DRAGÓN",       syllables: ["DRA","GÓN"],               emoji: "🐉", categories: ["fantasia"], tags: ["miedo"] },
    { word: "ROBOT",        syllables: ["RO","BOT"],                emoji: "🤖", categories: ["fantasia"] },
    { word: "FANTASMA",     syllables: ["FAN","TAS","MA"],          emoji: "👻", categories: ["fantasia"], tags: ["miedo"] },
    { word: "MAGO",         syllables: ["MA","GO"],                 emoji: "🧙", categories: ["fantasia"] },
    { word: "HADA",         syllables: ["HA","DA"],                 emoji: "🧚", categories: ["fantasia"] },
    { word: "REGALO",       syllables: ["RE","GA","LO"],            emoji: "🎁", categories: ["fantasia"] },
    { word: "BANDERA",      syllables: ["BAN","DE","RA"],           emoji: "🚩", categories: ["fantasia"] },
    { word: "MAPA",         syllables: ["MA","PA"],                 emoji: "🗺\u{FE0F}", categories: ["fantasia"] },
    { word: "IMÁN",         syllables: ["I","MÁN"],                 emoji: "🧲", categories: ["fantasia"] },
    { word: "DIAMANTE",     syllables: ["DIA","MAN","TE"],          emoji: "💎", categories: ["fantasia"] },
    { word: "JOYA",         syllables: ["JO","YA"],                 image: "img/joya.webp", categories: ["fantasia"] },
    { word: "WIFI",         syllables: ["WI","FI"],                 emoji: "📶", categories: ["fantasia"] },
  ];

  // Sanidad: detectar palabras duplicadas (mismo `word`).
  const seen = new Set();
  for (const e of DATA) {
    if (seen.has(e.word)) console.error(`[supeingo:dictionary] palabra duplicada: ${e.word}`);
    seen.add(e.word);
  }

  // Sanidad: cada entrada debe tener al menos una representación gráfica
  // (emoji o image). Sin esto, el renderer no sabría qué mostrar.
  for (const e of DATA) {
    if (!e.emoji && !e.image) {
      console.error(`[supeingo:dictionary] ${e.word}: necesita 'emoji' o 'image'`);
    }
  }

  // Sanidad: cada categoría declarada debe estar en el catálogo CATEGORIES.
  for (const e of DATA) {
    for (const c of (e.categories || [])) {
      if (!CATEGORIES.has(c)) {
        console.error(`[supeingo:dictionary] ${e.word}: categoría desconocida "${c}"`);
      }
    }
  }

  // Sanidad: cada tag declarado debe estar en el catálogo TAGS.
  for (const e of DATA) {
    for (const t of (e.tags || [])) {
      if (!TAGS.has(t)) {
        console.error(`[supeingo:dictionary] ${e.word}: tag desconocido "${t}"`);
      }
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
  // cargar; los juegos lo consultan en O(1). Una entrada con varias
  // categorías aparece en cada uno de sus bins. Las entradas sin
  // categoría no aparecen en ningún bin.
  window.SUPEINGO_CONTENT.dictionaryByCategory = DATA.reduce((acc, e) => {
    for (const c of (e.categories || [])) {
      if (!acc[c]) acc[c] = [];
      acc[c].push(e);
    }
    return acc;
  }, {});
  window.SUPEINGO_CONTENT.dictionaryCategories = [...CATEGORIES];
  window.SUPEINGO_CONTENT.dictionaryTags = [...TAGS];
})();

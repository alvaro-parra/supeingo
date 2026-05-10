// Palabras para "Forma palabras" (Constructor de palabras).
// Sección: Jugar → Forma palabras.
//
// Este fichero es una capa fina sobre data/dictionary.js: solo elige
// qué palabras del diccionario entran al juego y declara los
// distractores ("decoys") obligatorios para cada una. El emoji y el
// silabeo viven en el diccionario, no aquí — para no duplicar.
//
// Decoys: sílabas confusas que SIEMPRE aparecen en el banco junto a las
// correctas. Sirven para forzar parejas que cuestan (LE/RE, BA/VA, J/G,
// S/Z, LL/Y, M/N final, K/C/Q…). El resto del banco hasta 9 sílabas se
// rellena con sílabas al azar de otras palabras.

(function () {
  // Schema del fichero ANTES de hidratar (lo que escribimos a mano).
  const SCHEMA = {
    name: "words",
    fields: {
      word:   { type: "string", required: true },
      decoys: { type: "array", of: { type: "string" }, required: false },
    },
  };

  const ENTRIES = [
    // 1 sílaba
    { word: "PEZ",  decoys: ["PES"] },
    { word: "PIE" },
    { word: "FLOR", decoys: ["FLOL"] },
    { word: "SOL",  decoys: ["SOR"] },
    { word: "PAN",  decoys: ["PAM"] },
    { word: "TÉ",  decoys: ["TE"] },
    // 2 sílabas — núcleo del banco
    { word: "GATO",  decoys: ["JA"] },
    { word: "PATO" },
    { word: "OSO",   decoys: ["ZO", "HO"] },
    { word: "LUNA",  decoys: ["RU", "MA"] },
    { word: "CASA",  decoys: ["KA", "ZA"] },
    { word: "PIÑA",  decoys: ["NA"] },
    { word: "MANO",  decoys: ["MO", "NA"] },
    { word: "PERRO", decoys: ["RO", "LO", "LLO"] },
    { word: "RANA",  decoys: ["LA", "MA"] },
    { word: "VACA",  decoys: ["BA", "KA"] },
    { word: "SILLA", decoys: ["ZI", "YA"] },
    { word: "OJO",   decoys: ["HO", "GO"] },
    { word: "BOCA",  decoys: ["VO", "KA"] },
    { word: "HOJA",  decoys: ["O", "GA"] },
    { word: "QUESO", decoys: ["ZO", "KE"] },
    { word: "JAMÓN", decoys: ["MON"] },
    { word: "DEDO" },
    { word: "NUBE",  decoys: ["VE"] },
    { word: "LLAVE", decoys: ["YA", "BE"] },
    { word: "BOTA",  decoys: ["VO"] },
    { word: "FOCA" },
    { word: "TORO",  decoys: ["LO"] },
    { word: "LOBO",  decoys: ["RO", "VO"] },
    { word: "LIBRO", decoys: ["RI", "BLO"] },
    { word: "BARCO", decoys: ["VAL", "BAL", "VAR"] },
    // 3 sílabas
    { word: "CARACOL", decoys: ["LA"] },
    { word: "PLÁTANO" },
    { word: "JIRAFA",  decoys: ["GI", "LA"] },
    { word: "ABEJA",   decoys: ["VE"] },
    { word: "ZAPATO" },
    { word: "MANZANA", decoys: ["SA"] },
    { word: "TOMATE" },
    { word: "POLLITO" },
    { word: "CONEJO" },
    { word: "TORTUGA" },
    { word: "GUITARRA" },
    { word: "BALLENA", decoys: ["VA", "YE"] },
    // 4 sílabas
    { word: "COCODRILO", decoys: ["GO", "TRI"] },
    { word: "MARIPOSA", decoys: ["LI"] },
    { word: "ELEFANTE", decoys: ["RE"] },
    { word: "PARAGUAS", decoys: ["LA"] },
    // 5 sílabas
    { word: "HELICÓPTERO", decoys: ["RI", "LO"] },
  ];

  // Validamos la forma del fichero (pre-hidratación).
  window.SUPEINGO_VALIDATE(SCHEMA, ENTRIES);

  // Hidratamos juntando cada entrada con la del diccionario para que
  // los consumidores reciban {word, syllables, emoji, decoys} igual
  // que antes — sin duplicar el emoji ni el silabeo en este fichero.
  const dict = (window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionaryByWord) || {};
  const missing = [];
  const HYDRATED = ENTRIES.map(e => {
    const d = dict[e.word];
    if (!d) { missing.push(e.word); return null; }
    return {
      word: d.word,
      syllables: d.syllables,
      emoji: d.emoji,
      svg: d.svg,           // opcional — el renderer lo prefiere si existe
      image: d.image,       // opcional — más prioritario que svg/emoji
      decoys: e.decoys || [],
    };
  }).filter(Boolean);

  if (missing.length) {
    console.error(
      `[supeingo:words] ${missing.length} palabra(s) no están en data/dictionary.js — añádelas allí primero:`,
      missing
    );
  }

  // Registramos la versión PRE-hidratación en CONTENT_META para que el
  // schema cuadre (los tests validarán {word, decoys?}, no la forma
  // hidratada). El runtime sí usa la hidratada en SUPEINGO_CONTENT.words.
  window.SUPEINGO_REGISTER("words", SCHEMA, ENTRIES);

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.words = HYDRATED;
})();

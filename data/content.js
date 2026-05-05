// Banco de contenido — palabras, sílabas, alfabeto
// En producción esto sería un JSON cargado por fetch; aquí lo expongo en window
// para que los componentes Babel lo consuman sin async.

window.SUPEINGO_CONTENT = {
  alphabet: [
    // `spell` es lo que se ENVÍA al TTS para nombrar la letra. Lo damos
    // como sílaba española sin punto ni mayúsculas, para evitar que la voz
    // confunda "Be" con el inglés "to be". Si está vacío, se usa `upper`.
    { upper: "A", lower: "a", word: "ABEJA", emoji: "🐝" },
    { upper: "B", lower: "b", word: "BARCO", emoji: "⛵" },
    { upper: "C", lower: "c", word: "CASA",  emoji: "🏠" },
    { upper: "CH", lower: "ch", word: "CHOCOLATE", emoji: "🍫", digraph: true, spell: "che" },
    { upper: "D", lower: "d", word: "DEDO",  emoji: "👆" },
    { upper: "E", lower: "e", word: "ELEFANTE", emoji: "🐘" },
    { upper: "F", lower: "f", word: "FLOR",  emoji: "🌸" },
    { upper: "G", lower: "g", word: "GATO",  emoji: "🐱" },
    { upper: "H", lower: "h", word: "HOJA",  emoji: "🍃" },
    { upper: "I", lower: "i", word: "ISLA",  emoji: "🏝️" },
    { upper: "J", lower: "j", word: "JIRAFA", emoji: "🦒" },
    { upper: "K", lower: "k", word: "KIWI",  emoji: "🥝" },
    { upper: "L", lower: "l", word: "LUNA",  emoji: "🌙" },
    { upper: "LL", lower: "ll", word: "LLAVE", emoji: "🔑", digraph: true},
    { upper: "M", lower: "m", word: "MANO",  emoji: "✋" },
    { upper: "N", lower: "n", word: "NUBE",  emoji: "☁️" },
    { upper: "Ñ", lower: "ñ", word: "PIÑA",  emoji: "🍍" },
    { upper: "O", lower: "o", word: "OSO",   emoji: "🐻" },
    { upper: "P", lower: "p", word: "PATO",  emoji: "🦆" },
    { upper: "Q", lower: "q", word: "QUESO", emoji: "🧀" },
    { upper: "R", lower: "r", word: "RANA",  emoji: "🐸" },
    { upper: "S", lower: "s", word: "SOL",   emoji: "☀️" },
    { upper: "T", lower: "t", word: "TAZA",  emoji: "🍵" },
    { upper: "U", lower: "u", word: "UVA",   emoji: "🍇" },
    { upper: "V", lower: "v", word: "VACA",  emoji: "🐮" },
    { upper: "W", lower: "w", word: "WIFI",  emoji: "📶" },
    { upper: "X", lower: "x", word: "XILÓFONO", emoji: "🎵" },
    { upper: "Y", lower: "y", word: "YOYÓ",  emoji: "🪀", spell: "i griega" },
    { upper: "Z", lower: "z", word: "ZORRO", emoji: "🦊" },
  ],

  vowels: ["A", "E", "I", "O", "U"],

  // Palabras para "Constructor de palabras". Mezcla de 2-4 sílabas; las
  // de 2 sílabas dominan al ser las más sencillas y las que más
  // aparecerán en una sesión barajada.
  words: [
    // 2 sílabas — núcleo del banco
    { word: "GATO",  syllables: ["GA", "TO"],  emoji: "🐱" },
    { word: "PATO",  syllables: ["PA", "TO"],  emoji: "🦆" },
    { word: "OSO",   syllables: ["O", "SO"],   emoji: "🐻" },
    { word: "LUNA",  syllables: ["LU", "NA"],  emoji: "🌙" },
    { word: "CASA",  syllables: ["CA", "SA"],  emoji: "🏠" },
    { word: "PIÑA",  syllables: ["PI", "ÑA"],  emoji: "🍍" },
    { word: "MANO",  syllables: ["MA", "NO"],  emoji: "✋" },
    { word: "PERRO", syllables: ["PE", "RRO"], emoji: "🐶" },
    { word: "RANA",  syllables: ["RA", "NA"],  emoji: "🐸" },
    { word: "VACA",  syllables: ["VA", "CA"],  emoji: "🐮" },
    { word: "PEZ",   syllables: ["PEZ"],       emoji: "🐟" },
    { word: "MESA",  syllables: ["ME", "SA"],  emoji: "🪑" },
    { word: "OJO",   syllables: ["O", "JO"],   emoji: "👁️" },
    { word: "BOCA",  syllables: ["BO", "CA"],  emoji: "👄" },
    { word: "PIE",   syllables: ["PIE"],       emoji: "🦶" },
    { word: "FLOR",  syllables: ["FLOR"],      emoji: "🌸" },
    { word: "HOJA",  syllables: ["HO", "JA"],  emoji: "🍃" },
    { word: "SOL",   syllables: ["SOL"],       emoji: "☀️" },
    { word: "PAN",   syllables: ["PAN"],       emoji: "🍞" },
    { word: "QUESO", syllables: ["QUE", "SO"], emoji: "🧀" },
    { word: "TAZA",  syllables: ["TA", "ZA"],  emoji: "🍵" },
    { word: "DEDO",  syllables: ["DE", "DO"],  emoji: "👆" },
    { word: "NUBE",  syllables: ["NU", "BE"],  emoji: "☁️" },
    { word: "LLAVE", syllables: ["LLA", "VE"], emoji: "🔑" },
    { word: "BOTA",  syllables: ["BO", "TA"],  emoji: "👢" },
    { word: "FOCA",  syllables: ["FO", "CA"],  emoji: "🦭" },
    { word: "TORO",  syllables: ["TO", "RO"],  emoji: "🐂" },
    { word: "LOBO",  syllables: ["LO", "BO"],  emoji: "🐺" },
    { word: "LIBRO", syllables: ["LI", "BRO"], emoji: "📕" },
    { word: "BARCO", syllables: ["BAR", "CO"], emoji: "⛵" },
    // 3 sílabas
    { word: "CARACOL", syllables: ["CA", "RA", "COL"],  emoji: "🐌" },
    { word: "PLÁTANO", syllables: ["PLÁ", "TA", "NO"],  emoji: "🍌" },
    { word: "JIRAFA",  syllables: ["JI", "RA", "FA"],   emoji: "🦒" },
    { word: "ABEJA",   syllables: ["A", "BE", "JA"],    emoji: "🐝" },
    { word: "ZAPATO",  syllables: ["ZA", "PA", "TO"],   emoji: "👞" },
    { word: "MANZANA", syllables: ["MAN", "ZA", "NA"],  emoji: "🍎" },
    { word: "TOMATE",  syllables: ["TO", "MA", "TE"],   emoji: "🍅" },
    { word: "POLLITO", syllables: ["PO", "LLI", "TO"],  emoji: "🐤" },
    { word: "CONEJO",  syllables: ["CO", "NE", "JO"],   emoji: "🐰" },
    { word: "TORTUGA", syllables: ["TOR", "TU", "GA"],  emoji: "🐢" },
    { word: "GUITARRA",syllables: ["GUI", "TA", "RRA"], emoji: "🎸" },
    { word: "BALLENA", syllables: ["BA", "LLE", "NA"],  emoji: "🐳" },
    // 4 sílabas
    { word: "MARIPOSA", syllables: ["MA", "RI", "PO", "SA"], emoji: "🦋" },
    { word: "ELEFANTE", syllables: ["E", "LE", "FAN", "TE"], emoji: "🐘" },
    { word: "PARAGUAS", syllables: ["PA", "RA", "GUAS"],     emoji: "☂️" },
    { word: "HELICÓPTERO", syllables: ["HE", "LI", "CÓP", "TE", "RO"], emoji: "🚁" },
  ],

  // Sílabas básicas — consonante + cada vocal, B → Z (Q es excepción: solo
  // QUE, QUI). Los dígrafos CH y LL aparecen aquí siempre; en el futuro
  // podríamos respetar SUPEINGO_TEACHING_CONFIG.includeDigraphs si hace falta.
  // Decisión pedagógica: enseñamos C/G/H con sus 5 vocales literales para
  // priorizar la simplicidad visual; los sonidos suaves (CE/CI, GE/GI,
  // H muda) se trabajarán cuando hagamos las "reglas avanzadas de
  // separación silábica" (ver base.md, futuras iteraciones).
  // Cada sílaba es un objeto { syllable, spell? }. `syllable` es lo que se
  // muestra en la tabla; `spell` (opcional) es lo que se envía al TTS cuando
  // su pronunciación no es obvia para una voz es-ES.
  syllableFamilies: [
    { consonant: "B", syllables: [{ syllable: "BA" }, { syllable: "BE", spell: "VE" }, { syllable: "BI" }, { syllable: "BO" }, { syllable: "BU" }] },
    { consonant: "C", syllables: [{ syllable: "CA" }, { syllable: "CE" }, { syllable: "CI", spell: "ZI" }, { syllable: "CO" }, { syllable: "CU", spell: "KU" }] },
    { consonant: "CH", digraph: true, syllables: [{ syllable: "CHA" }, { syllable: "CHE" }, { syllable: "CHI" }, { syllable: "CHO" }, { syllable: "CHU" }] },
    { consonant: "D", syllables: [{ syllable: "DA" }, { syllable: "DE" }, { syllable: "DI" }, { syllable: "DO" }, { syllable: "DU" }] },
    { consonant: "F", syllables: [{ syllable: "FA" }, { syllable: "FE" }, { syllable: "FI" }, { syllable: "FO" }, { syllable: "FU" }] },
    { consonant: "G", syllables: [{ syllable: "GA" }, { syllable: "GE", spell: "JEE" }, { syllable: "GI", spell: "JÍ" }, { syllable: "GO", spell: "GHO" }, { syllable: "GU" }] },
    { consonant: "H", syllables: [{ syllable: "HA", spell: "A" }, { syllable: "HE", spell: "E" }, { syllable: "HI", spell: "I" }, { syllable: "HO", spell: "O" }, { syllable: "HU", spell: "U" }] },
    { consonant: "J", syllables: [{ syllable: "JA" }, { syllable: "JE" }, { syllable: "JI" }, { syllable: "JO" }, { syllable: "JU", spell: "JÚ" }] },
    { consonant: "K", syllables: [{ syllable: "KA" }, { syllable: "KE" }, { syllable: "KI" }, { syllable: "KO" }, { syllable: "KU" }] },
    { consonant: "L", syllables: [{ syllable: "LA" }, { syllable: "LE" }, { syllable: "LI" }, { syllable: "LO" }, { syllable: "LU" }] },
    { consonant: "LL", digraph: true, syllables: [{ syllable: "LLA" }, { syllable: "LLE" }, { syllable: "LLI" }, { syllable: "LLO" }, { syllable: "LLU" }] },
    { consonant: "M", syllables: [{ syllable: "MA" }, { syllable: "ME" }, { syllable: "MI" }, { syllable: "MO" }, { syllable: "MU" }] },
    { consonant: "N", syllables: [{ syllable: "NA" }, { syllable: "NE" }, { syllable: "NI" }, { syllable: "NO" }, { syllable: "NU" }] },
    { consonant: "Ñ", syllables: [{ syllable: "ÑA" }, { syllable: "ÑE" }, { syllable: "ÑI" }, { syllable: "ÑO" }, { syllable: "ÑU" }] },
    { consonant: "P", syllables: [{ syllable: "PA" }, { syllable: "PE" }, { syllable: "PI" }, { syllable: "PO" }, { syllable: "PU" }] },
    // Q en español solo se combina con UE/UI (la U es muda). En el
    // silabario tradicional se enseña como "QUE, QUI" (2 sílabas).
    { consonant: "Q", syllables: [{ syllable: "QUE" }, { syllable: "QUI" }] },
    { consonant: "R", syllables: [{ syllable: "RA" }, { syllable: "RE" }, { syllable: "RI" }, { syllable: "RO" }, { syllable: "RU" }] },
    { consonant: "S", syllables: [{ syllable: "SA" }, { syllable: "SE" }, { syllable: "SI" }, { syllable: "SO" }, { syllable: "SU" }] },
    { consonant: "T", syllables: [{ syllable: "TA" }, { syllable: "TE" }, { syllable: "TI" }, { syllable: "TO" }, { syllable: "TU" }] },
    { consonant: "V", syllables: [{ syllable: "VA" }, { syllable: "VE" }, { syllable: "VI" }, { syllable: "VO" }, { syllable: "VU" }] },
    { consonant: "W", syllables: [{ syllable: "WA" }, { syllable: "WE" }, { syllable: "WI" }, { syllable: "WO" }, { syllable: "WU" }] },
    { consonant: "X", syllables: [{ syllable: "XA" }, { syllable: "XE" }, { syllable: "XI" }, { syllable: "XO" }, { syllable: "XU" }] },
    { consonant: "Y", syllables: [{ syllable: "YA" }, { syllable: "YE" }, { syllable: "YI" }, { syllable: "YO" }, { syllable: "YU" }] },
    { consonant: "Z", syllables: [{ syllable: "ZA" }, { syllable: "ZE" }, { syllable: "ZI" }, { syllable: "ZO" }, { syllable: "ZU" }] },
  ],
};

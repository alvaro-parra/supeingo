// Palabras para "Forma la palabra" (Constructor de palabras).
// Sección: Jugar → Forma la palabra.
//
// Mezcla de 1-5 sílabas; las de 2 sílabas dominan al ser las más
// sencillas y las que más aparecerán en una sesión barajada.

(function () {
  const SCHEMA = {
    name: "words",
    fields: {
      word: { type: "string", required: true },
      syllables: { type: "array", of: { type: "string" }, required: true },
      emoji: { type: "string", required: true },
      // Sílabas distractoras OBLIGATORIAS — siempre aparecen en el banco
      // de esta palabra junto a las correctas. Útil para forzar parejas
      // confusas (LE/RE, BA/VA, J/G, S/Z, LL/Y…) y enseñar a discriminarlas.
      // El resto del banco hasta 9 sílabas se rellena con distractoras al azar.
      decoys: { type: "array", of: { type: "string" }, required: false },
    },
  };

  const DATA = [
    // 1 sílaba
    { word: "PEZ",  syllables: ["PEZ"],  emoji: "🐟", decoys: ["PES"] },
    { word: "PIE",  syllables: ["PIE"],  emoji: "🦶" },
    { word: "FLOR", syllables: ["FLOR"], emoji: "🌸", decoys: ["FLOL"] },
    { word: "SOL",  syllables: ["SOL"],  emoji: "☀️", decoys: ["SOR"] },
    { word: "PAN",  syllables: ["PAN"],  emoji: "🍞", decoys: ["PAM"] },
    // 2 sílabas — núcleo del banco
    { word: "GATO",  syllables: ["GA", "TO"],  emoji: "🐱", decoys: ["JA"] },
    { word: "PATO",  syllables: ["PA", "TO"],  emoji: "🦆" },
    { word: "OSO",   syllables: ["O", "SO"],   emoji: "🐻", decoys: ["ZO", "HO"] },
    { word: "LUNA",  syllables: ["LU", "NA"],  emoji: "🌙", decoys: ["RU", "MA"] },
    { word: "CASA",  syllables: ["CA", "SA"],  emoji: "🏠", decoys: ["KA", "ZA"] },
    { word: "PIÑA",  syllables: ["PI", "ÑA"],  emoji: "🍍", decoys: ["NA"] },
    { word: "MANO",  syllables: ["MA", "NO"],  emoji: "✋", decoys: ["MO", "NA"] },
    { word: "PERRO", syllables: ["PE", "RRO"], emoji: "🐶", decoys: ["RO", "LO", "LLO"] },
    { word: "RANA",  syllables: ["RA", "NA"],  emoji: "🐸", decoys: ["LA", "MA"] },
    { word: "VACA",  syllables: ["VA", "CA"],  emoji: "🐮", decoys: ["BA", "KA"] },
    { word: "MESA",  syllables: ["ME", "SA"],  emoji: "🪑", decoys: ["ZA"] },
    { word: "OJO",   syllables: ["O", "JO"],   emoji: "👁️", decoys: ["HO", "GO"] },
    { word: "BOCA",  syllables: ["BO", "CA"],  emoji: "👄", decoys: ["VO", "KA"] },
    { word: "HOJA",  syllables: ["HO", "JA"],  emoji: "🍃", decoys: ["O", "GA"] },
    { word: "QUESO", syllables: ["QUE", "SO"], emoji: "🧀", decoys: ["ZO", "KE"] },
    { word: "TAZA",  syllables: ["TA", "ZA"],  emoji: "🍵", decoys: ["SA"] },
    { word: "DEDO",  syllables: ["DE", "DO"],  emoji: "👆" },
    { word: "NUBE",  syllables: ["NU", "BE"],  emoji: "☁️", decoys: ["VE"] },
    { word: "LLAVE", syllables: ["LLA", "VE"], emoji: "🔑", decoys: ["YA", "BE"] },
    { word: "BOTA",  syllables: ["BO", "TA"],  emoji: "👢", decoys: ["VO"] },
    { word: "FOCA",  syllables: ["FO", "CA"],  emoji: "🦭" },
    { word: "TORO",  syllables: ["TO", "RO"],  emoji: "🐂", decoys: ["LO"] },
    { word: "LOBO",  syllables: ["LO", "BO"],  emoji: "🐺", decoys: ["RO", "VO"] },
    { word: "LIBRO", syllables: ["LI", "BRO"], emoji: "📕", decoys: ["RI", "BLO"] },
    { word: "BARCO", syllables: ["BAR", "CO"], emoji: "⛵", decoys: ["VAL", "BAL", "VAR"] },
    // 3 sílabas
    { word: "CARACOL", syllables: ["CA", "RA", "COL"],  emoji: "🐌", decoys: ["LA"] },
    { word: "PLÁTANO", syllables: ["PLÁ", "TA", "NO"],  emoji: "🍌" },
    { word: "JIRAFA",  syllables: ["JI", "RA", "FA"],   emoji: "🦒", decoys: ["GI", "LA"] },
    { word: "ABEJA",   syllables: ["A", "BE", "JA"],    emoji: "🐝", decoys: ["VE"] },
    { word: "ZAPATO",  syllables: ["ZA", "PA", "TO"],   emoji: "👞" },
    { word: "MANZANA", syllables: ["MAN", "ZA", "NA"],  emoji: "🍎", decoys: ["SA"] },
    { word: "TOMATE",  syllables: ["TO", "MA", "TE"],   emoji: "🍅" },
    { word: "POLLITO", syllables: ["PO", "LLI", "TO"],  emoji: "🐤" },
    { word: "CONEJO",  syllables: ["CO", "NE", "JO"],   emoji: "🐰" },
    { word: "TORTUGA", syllables: ["TOR", "TU", "GA"],  emoji: "🐢" },
    { word: "GUITARRA",syllables: ["GUI", "TA", "RRA"], emoji: "🎸" },
    { word: "BALLENA", syllables: ["BA", "LLE", "NA"],  emoji: "🐳", decoys: ["VA", "YE"] },
    // 4 sílabas
    { word: "MARIPOSA", syllables: ["MA", "RI", "PO", "SA"], emoji: "🦋", decoys: ["LI"] },
    { word: "ELEFANTE", syllables: ["E", "LE", "FAN", "TE"], emoji: "🐘", decoys: ["RE"] },
    { word: "PARAGUAS", syllables: ["PA", "RA", "GUAS"],     emoji: "☂️", decoys: ["LA"] },
    // 5 sílabas
    { word: "HELICÓPTERO", syllables: ["HE", "LI", "CÓP", "TE", "RO"], emoji: "🚁", decoys: ["RI", "LO"] },
  ];

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("words", SCHEMA, DATA);

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.words = DATA;
})();

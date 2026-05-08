// Letras del abecedario español + vocales.
// Sección: Aprender → Letras.
//
// Self-contained: schema + data en el mismo fichero. Si en el futuro
// se cambia el formato (p.ej. añadir `audioFile`), basta con actualizar
// SCHEMA y los tests detectarán cualquier entrada que no encaje.

(function () {
  const SCHEMA = {
    name: "alphabet",
    fields: {
      upper: { type: "string", required: true },
      lower: { type: "string", required: true },
      word: { type: "string", required: true },     // palabra-ejemplo
      emoji: { type: "string", required: true },
      digraph: { type: "boolean", required: false }, // CH, LL
      spell: { type: "string", required: false },   // override TTS (p.ej. Y → "i griega")
    },
  };

  const DATA = [
    // `spell` es lo que se ENVÍA al TTS para nombrar la letra. Lo damos
    // como sílaba española sin punto ni mayúsculas, para evitar que la voz
    // confunda "Be" con el inglés "to be". Si está vacío, se usa `upper`.
    { upper: "A",  lower: "a",  word: "ABEJA",     emoji: "🐝" },
    { upper: "B",  lower: "b",  word: "BARCO",     emoji: "⛵" },
    { upper: "C",  lower: "c",  word: "CASA",      emoji: "🏠" },
    { upper: "CH", lower: "ch", word: "CHOCOLATE", emoji: "🍫", digraph: true, spell: "che" },
    { upper: "D",  lower: "d",  word: "DEDO",      emoji: "👆" },
    { upper: "E",  lower: "e",  word: "ELEFANTE",  emoji: "🐘" },
    { upper: "F",  lower: "f",  word: "FLOR",      emoji: "🌸" },
    { upper: "G",  lower: "g",  word: "GATO",      emoji: "🐱" },
    { upper: "H",  lower: "h",  word: "HOJA",      emoji: "🍃" },
    { upper: "I",  lower: "i",  word: "ISLA",      emoji: "🏝️" },
    { upper: "J",  lower: "j",  word: "JIRAFA",    emoji: "🦒" },
    { upper: "K",  lower: "k",  word: "KIWI",      emoji: "🥝" },
    { upper: "L",  lower: "l",  word: "LUNA",      emoji: "🌙" },
    { upper: "LL", lower: "ll", word: "LLAVE",     emoji: "🔑", digraph: true },
    { upper: "M",  lower: "m",  word: "MANO",      emoji: "✋" },
    { upper: "N",  lower: "n",  word: "NUBE",      emoji: "☁️" },
    { upper: "Ñ",  lower: "ñ",  word: "PIÑA",      emoji: "🍍" },
    { upper: "O",  lower: "o",  word: "OSO",       emoji: "🐻" },
    { upper: "P",  lower: "p",  word: "PATO",      emoji: "🦆" },
    { upper: "Q",  lower: "q",  word: "QUESO",     emoji: "🧀" },
    { upper: "R",  lower: "r",  word: "RANA",      emoji: "🐸" },
    { upper: "S",  lower: "s",  word: "SOL",       emoji: "☀️" },
    { upper: "T",  lower: "t",  word: "TAZA",      emoji: "🍵" },
    { upper: "U",  lower: "u",  word: "UVA",       emoji: "🍇" },
    { upper: "V",  lower: "v",  word: "VACA",      emoji: "🐮" },
    { upper: "W",  lower: "w",  word: "WIFI",      emoji: "📶" },
    { upper: "X",  lower: "x",  word: "XILÓFONO",  emoji: "🎵" },
    { upper: "Y",  lower: "y",  word: "YOYÓ",      emoji: "🪀", spell: "i griega" },
    { upper: "Z",  lower: "z",  word: "ZORRO",     emoji: "🦊" },
  ];

  const VOWELS = ["A", "E", "I", "O", "U"];

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("alphabet", SCHEMA, DATA);

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.alphabet = DATA;
  window.SUPEINGO_CONTENT.vowels = VOWELS;
})();

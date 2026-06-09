// Diccionario en miniatura para tests deterministas. Cubre:
//  - varias longitudes (3 a 10)
//  - varias categorías (animales, comida, hogar)
//  - tags ("miedo") para probar hideScary
//  - una entrada con Ñ y otra con tilde, para probar allowAccents
//  - todas con emoji (no requiere assets)
module.exports = [
  { word: "GATO",       syllables: ["GA","TO"],      emoji: "🐱", categories: ["animales"] },
  { word: "PERRO",      syllables: ["PE","RRO"],     emoji: "🐶", categories: ["animales"] },
  { word: "OSO",        syllables: ["O","SO"],       emoji: "🐻", categories: ["animales"] },
  { word: "RANA",       syllables: ["RA","NA"],      emoji: "🐸", categories: ["animales"] },
  { word: "VACA",       syllables: ["VA","CA"],      emoji: "🐮", categories: ["animales"] },
  { word: "PATO",       syllables: ["PA","TO"],      emoji: "🦆", categories: ["animales"] },
  { word: "LEON",       syllables: ["LE","ON"],      emoji: "🦁", categories: ["animales"] },
  { word: "TIGRE",      syllables: ["TI","GRE"],     emoji: "🐯", categories: ["animales"], tags: ["miedo"] },
  { word: "ELEFANTE",   syllables: ["E","LE","FAN","TE"], emoji: "🐘", categories: ["animales"] },
  { word: "JIRAFA",     syllables: ["JI","RA","FA"], emoji: "🦒", categories: ["animales"] },
  { word: "ARANA",      syllables: ["A","RA","NA"],  emoji: "🕷",  categories: ["animales"], tags: ["miedo"] },
  { word: "PAN",        syllables: ["PAN"],          emoji: "🍞", categories: ["comida"] },
  { word: "QUESO",      syllables: ["QUE","SO"],     emoji: "🧀", categories: ["comida"] },
  { word: "ARROZ",      syllables: ["A","RROZ"],     emoji: "🍚", categories: ["comida"] },
  { word: "TOMATE",     syllables: ["TO","MA","TE"], emoji: "🍅", categories: ["comida"] },
  { word: "SOL",        syllables: ["SOL"],          emoji: "☀",  categories: ["hogar"] },
  { word: "LUNA",       syllables: ["LU","NA"],      emoji: "🌙", categories: ["hogar"] },
  { word: "CASA",       syllables: ["CA","SA"],      emoji: "🏠", categories: ["hogar"] },
  { word: "MESA",       syllables: ["ME","SA"],      emoji: "🪑", categories: ["hogar"] },
  { word: "PIÑA",       syllables: ["PI","ÑA"],      emoji: "🍍", categories: ["comida"] },
  { word: "LEÓN",       syllables: ["LE","ÓN"],      emoji: "🦁", categories: ["animales"] },
];

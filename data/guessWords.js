// Palabras para "Adivina la palabra" — pool propio del juego.
//
// Cada entrada referencia una `word` del diccionario y declara
// metadatos extra que solo este juego usa: comparadores explícitos
// de tamaño (más pequeño/grande que una palabra concreta) y color
// opcional.
//
// El emoji/svg/sílabas/categoría se hidratan desde data/dictionary.js
// igual que hace data/alphabet.js — no se duplican aquí.
//
// Conscientemente NO usamos todo el diccionario: este juego empieza
// pequeño y crece curado. Una palabra entra cuando podemos darle
// pistas concretas (tamaño/color/categoría con sentido).

(function () {
  // Iconos por categoría — se muestran junto al texto en la pista de
  // categoría para que niños que aún no leen pillen la pista solo con
  // la imagen.
  const CATEGORY_ICONS = {
    animales:   "🐾",
    vegetales:  "🥕",
    comida:     "🍽\u{FE0F}",
    hogar:      "🛋\u{FE0F}",
    naturaleza: "🌳",
    cuerpo:     "👤",
    transporte: "🚗",
    ropa:       "👕",
    musica:     "🎵",
    fantasia:   "🪄",
  };

  // Etiquetas que aparecen en la pista de categoría.
  const CATEGORY_LABELS = {
    animales:   "Es un animal",
    vegetales:  "Es un vegetal",
    comida:     "Es comida",
    hogar:      "Es algo de la casa",
    naturaleza: "Es de la naturaleza",
    cuerpo:     "Es parte del cuerpo",
    transporte: "Es un transporte",
    ropa:       "Es ropa",
    musica:     "Es de música",
    fantasia:   "Es fantasía",
  };

  // Paleta de colores soportada por la pista de color, con hex para
  // el swatch. Si añades un color nuevo, súmalo aquí.
  const COLOR_HEX = {
    rojo:     "#E53935",
    naranja:  "#FB8C00",
    amarillo: "#FDD835",
    verde:    "#43A047",
    azul:     "#1E88E5",
    morado:   "#8E24AA",
    rosa:     "#EC407A",
    "marrón": "#6D4C41",
    negro:    "#212121",
    blanco:   "#FAFAFA",
    gris:     "#757575",
  };

  // Schema del fichero ANTES de hidratar. Como en data/alphabet.js,
  // validamos primero (con solo los campos declarados a mano) y
  // hidratamos después — así el validador estricto no se queja de
  // los campos añadidos.
  const SCHEMA = {
    name: "guessWords",
    fields: {
      word:        { type: "string", required: true },
      sizeSmaller: { type: "array",  of: { type: "string" }, required: false },
      sizeLarger:  { type: "array",  of: { type: "string" }, required: false },
      color:       { type: "string", required: false },
    },
  };

  const DATA = [
    {
      word: "TORTUGA",
      sizeSmaller: ["ABEJA", "HORMIGA"],
      sizeLarger:  ["CABALLO", "ELEFANTE"],
      color: "verde",
    },
  ];

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("guessWords", SCHEMA, DATA);

  // Hidratar desde el diccionario: emoji/svg/sílabas/categoría.
  const dict = window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionaryByWord;
  if (!dict) {
    console.error("[supeingo:guessWords] dictionary no cargado — carga data/dictionary.js antes.");
  } else {
    const missing = [];
    for (const e of DATA) {
      const d = dict[e.word];
      if (!d) { missing.push(e.word); continue; }
      if (d.emoji)     e.emoji     = d.emoji;
      if (d.svg)       e.svg       = d.svg;
      if (d.syllables) e.syllables = d.syllables;
      if (d.category)  e.category  = d.category;
    }
    if (missing.length) {
      console.error(`[supeingo:guessWords] palabras no encontradas en el diccionario: ${missing.join(", ")}`);
    }
    // Comprobar que los comparadores referencian palabras existentes en
    // el diccionario — si no, el render de la pista de tamaño se rompe.
    for (const e of DATA) {
      const refs = [...(e.sizeSmaller || []), ...(e.sizeLarger || [])];
      for (const r of refs) {
        if (!dict[r]) {
          console.error(`[supeingo:guessWords] ${e.word}: comparador "${r}" no existe en el diccionario.`);
        }
      }
    }
    // Comprobar colores válidos
    for (const e of DATA) {
      if (e.color && !(e.color in COLOR_HEX)) {
        console.error(`[supeingo:guessWords] ${e.word}: color "${e.color}" no está en la paleta soportada.`);
      }
    }
  }

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.guessWords = DATA;
  window.SUPEINGO_CONTENT.guessCategoryIcons  = CATEGORY_ICONS;
  window.SUPEINGO_CONTENT.guessCategoryLabels = CATEGORY_LABELS;
  window.SUPEINGO_CONTENT.guessColorHex       = COLOR_HEX;
})();

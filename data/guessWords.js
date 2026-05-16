// Palabras para "Adivina la palabra" — pool propio del juego.
//
// Cada entrada referencia una `word` del diccionario y declara
// metadatos extra que solo este juego usa: comparadores explícitos
// de tamaño (más pequeño/grande que una palabra concreta) y color
// opcional.
//
// El emoji/image/sílabas/categoría se hidratan desde data/dictionary.js
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
      // `colors`: lista de uno o más colores (p.ej. SANDÍA: verde + rojo).
      // En la pista 2 se renderizan N swatches + texto unido en español.
      colors:      { type: "array",  of: { type: "string" }, required: false },
    },
  };

  const DATA = [
    // ── Animales ─────────────────────────────────────────────
    {
      word: "TORTUGA",
      sizeSmaller: ["ABEJA", "HORMIGA", "RATÓN", "CARACOL", "MARIPOSA"],
      sizeLarger:  ["CABALLO", "ELEFANTE", "VACA", "OSO", "BALLENA"],
      colors: ["verde"],
    },
    {
      word: "ELEFANTE",
      sizeSmaller: ["CABALLO", "VACA", "OSO", "LEÓN", "TIGRE", "CAMELLO", "CEBRA"],
      sizeLarger:  ["BALLENA"],
      colors: ["gris"],
    },
    {
      word: "ABEJA",
      sizeSmaller: ["HORMIGA"],
      sizeLarger:  ["GATO", "PERRO", "RATÓN", "RANA", "CARACOL"],
      colors: ["amarillo", "negro"],
    },
    {
      word: "RANA",
      sizeSmaller: ["HORMIGA", "ABEJA", "CARACOL", "MARIPOSA"],
      sizeLarger:  ["GATO", "CABALLO", "PERRO", "OSO", "VACA"],
      colors: ["verde"],
    },
    {
      word: "CERDO",
      sizeSmaller: ["GATO", "RANA", "PERRO", "GALLINA", "PATO", "ZORRO"],
      sizeLarger:  ["VACA", "CABALLO", "OSO", "ELEFANTE", "JIRAFA", "CAMELLO"],
      colors: ["rosa"],
    },
    {
      word: "POLLITO",
      sizeSmaller: ["ABEJA", "HORMIGA", "MARIPOSA", "RATÓN"],
      sizeLarger:  ["GALLINA", "PATO", "GATO", "PERRO", "CONEJO"],
      colors: ["amarillo"],
    },
    {
      word: "JIRAFA",
      sizeSmaller: ["CABALLO", "OSO", "VACA", "CAMELLO", "CEBRA", "LEÓN", "TIGRE"],
      sizeLarger:  ["BALLENA"],
      colors: ["amarillo", "marrón"],
    },
    {
      word: "PINGÜINO",
      sizeSmaller: ["PATO", "GALLINA", "GATO", "CONEJO"],
      sizeLarger:  ["PERRO", "OSO", "CABRA", "OVEJA", "CERDO"],
      colors: ["negro", "blanco"],
    },
    {
      word: "BALLENA",
      sizeSmaller: ["TIBURÓN", "DELFÍN", "ELEFANTE", "JIRAFA"],
      // No hay nada más grande en el diccionario; se omite la pista 4.
      colors: ["azul"],
    },
    {
      word: "HORMIGA",
      // No hay nada más pequeño en el diccionario; se omite la pista 3.
      sizeLarger:  ["ABEJA", "MARIPOSA", "RATÓN", "CARACOL", "ARAÑA"],
      colors: ["negro"],
    },
    {
      word: "GATO",
      // Sin colores: gatos varían demasiado (negro, blanco, naranja,
      // gris, atigrado…) como para fijar uno solo.
      sizeSmaller: ["HORMIGA", "RATÓN", "ABEJA", "CARACOL"],
      sizeLarger:  ["PERRO", "OSO", "CABALLO", "VACA", "CERDO"],
    },
    {
      word: "PERRO",
      // Sin colores: razas muy variadas.
      sizeSmaller: ["GATO", "RATÓN", "ABEJA", "CONEJO"],
      sizeLarger:  ["OSO", "CABALLO", "VACA", "ELEFANTE"],
    },
    {
      word: "VACA",
      sizeSmaller: ["GATO", "PERRO", "OVEJA", "CABRA", "CERDO"],
      sizeLarger:  ["ELEFANTE", "JIRAFA"],
      colors: ["blanco", "negro"],
    },
    {
      word: "OSO",
      sizeSmaller: ["GATO", "PERRO", "ZORRO", "CONEJO"],
      sizeLarger:  ["ELEFANTE", "JIRAFA"],
      colors: ["marrón"],
    },
    {
      word: "LEÓN",
      sizeSmaller: ["GATO", "PERRO", "ZORRO", "CONEJO"],
      sizeLarger:  ["ELEFANTE", "JIRAFA"],
      colors: ["amarillo", "marrón"],
    },
    {
      word: "TIGRE",
      sizeSmaller: ["GATO", "PERRO", "ZORRO"],
      sizeLarger:  ["ELEFANTE", "JIRAFA"],
      colors: ["naranja", "negro"],
    },
    {
      word: "RATÓN",
      sizeSmaller: ["HORMIGA", "ABEJA", "CARACOL"],
      sizeLarger:  ["GATO", "PERRO", "CONEJO", "RANA"],
      colors: ["gris"],
    },
    {
      word: "CARACOL",
      sizeSmaller: ["HORMIGA", "ABEJA"],
      sizeLarger:  ["GATO", "RATÓN", "RANA", "PATO"],
      colors: ["marrón"],
    },
    {
      word: "SERPIENTE",
      sizeSmaller: ["HORMIGA", "RANA", "LAGARTO", "RATÓN"],
      sizeLarger:  ["GATO", "PERRO", "CABALLO", "VACA"],
      colors: ["verde", "marrón"],
    },
    {
      word: "COCODRILO",
      sizeSmaller: ["RANA", "GATO", "LAGARTO", "PERRO"],
      sizeLarger:  ["ELEFANTE", "BALLENA"],
      colors: ["verde"],
    },

    // ── Frutas y verduras ────────────────────────────────────
    {
      word: "MANZANA",
      sizeSmaller: ["FRESA", "UVA", "CEREZA"],
      sizeLarger:  ["SANDÍA", "MELÓN", "PIÑA", "COCO"],
      colors: ["rojo"],
    },
    {
      word: "PLÁTANO",
      sizeSmaller: ["FRESA", "UVA", "CEREZA"],
      sizeLarger:  ["SANDÍA", "MELÓN", "PIÑA", "COCO"],
      colors: ["amarillo"],
    },
    {
      word: "SANDÍA",
      sizeSmaller: ["MANZANA", "NARANJA", "MELÓN", "PIÑA", "COCO", "MANGO", "AGUACATE"],
      // No hay nada más grande en el diccionario; se omite la pista 4.
      colors: ["verde", "rojo"],
    },
    {
      word: "ZANAHORIA",
      sizeSmaller: ["FRESA", "UVA", "CEREZA"],
      sizeLarger:  ["SANDÍA", "MELÓN", "PIÑA", "COCO"],
      colors: ["naranja"],
    },
    {
      word: "BERENJENA",
      sizeSmaller: ["FRESA", "UVA", "CEREZA", "KIWI"],
      sizeLarger:  ["SANDÍA", "MELÓN", "PIÑA", "COCO"],
      colors: ["morado"],
    },
    {
      word: "UVA",
      // Nada más pequeño en el diccionario; se omite la pista 3.
      sizeLarger:  ["MANZANA", "FRESA", "NARANJA", "CEREZA", "TOMATE", "KIWI", "LIMÓN"],
      colors: ["morado"],
    },
    {
      word: "FRESA",
      sizeSmaller: ["UVA", "CEREZA"],
      sizeLarger:  ["MANZANA", "NARANJA", "TOMATE", "LIMÓN"],
      colors: ["rojo"],
    },
    {
      word: "NARANJA",
      sizeSmaller: ["UVA", "FRESA", "CEREZA"],
      sizeLarger:  ["MELÓN", "SANDÍA", "PIÑA", "COCO"],
      colors: ["naranja"],
    },
    {
      word: "LIMÓN",
      sizeSmaller: ["UVA", "FRESA", "CEREZA"],
      sizeLarger:  ["MELÓN", "SANDÍA", "PIÑA", "MANZANA"],
      colors: ["amarillo"],
    },
    {
      word: "CEREZA",
      // Nada más pequeño en el diccionario; se omite la pista 3.
      sizeLarger:  ["FRESA", "MANZANA", "NARANJA", "LIMÓN", "TOMATE"],
      colors: ["rojo"],
    },
    {
      word: "TOMATE",
      sizeSmaller: ["UVA", "FRESA", "CEREZA"],
      sizeLarger:  ["MELÓN", "SANDÍA", "PIÑA", "NARANJA", "BERENJENA"],
      colors: ["rojo"],
    },
    {
      word: "PEPINO",
      sizeSmaller: ["UVA", "FRESA", "CEREZA", "TOMATE"],
      sizeLarger:  ["SANDÍA", "PIÑA", "MELÓN", "BERENJENA"],
      colors: ["verde"],
    },
    {
      word: "LECHUGA",
      sizeSmaller: ["FRESA", "UVA", "TOMATE"],
      sizeLarger:  ["SANDÍA", "MELÓN", "PIÑA"],
      colors: ["verde"],
    },
    {
      word: "BRÓCOLI",
      sizeSmaller: ["FRESA", "UVA", "CEREZA"],
      sizeLarger:  ["LECHUGA", "SANDÍA", "MELÓN"],
      colors: ["verde"],
    },
    {
      word: "AGUACATE",
      sizeSmaller: ["FRESA", "UVA", "CEREZA", "TOMATE"],
      sizeLarger:  ["PIÑA", "MELÓN", "SANDÍA"],
      colors: ["verde", "marrón"],
    },
    {
      word: "PIÑA",
      sizeSmaller: ["MANZANA", "PERA", "NARANJA", "LIMÓN", "AGUACATE"],
      sizeLarger:  ["SANDÍA", "MELÓN"],
      colors: ["amarillo", "marrón"],
    },
  ];

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("guessWords", SCHEMA, DATA);

  // Hidratar desde el diccionario: emoji/image/sílabas/categoría.
  const dict = window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionaryByWord;
  if (!dict) {
    console.error("[supeingo:guessWords] dictionary no cargado — carga data/dictionary.js antes.");
  } else {
    const missing = [];
    for (const e of DATA) {
      const d = dict[e.word];
      if (!d) { missing.push(e.word); continue; }
      if (d.emoji)      e.emoji      = d.emoji;
      if (d.image)      e.image      = d.image;
      if (d.syllables)  e.syllables  = d.syllables;
      if (d.categories) e.categories = d.categories;
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
    // Comprobar colores válidos — todos los del array deben estar en la paleta.
    for (const e of DATA) {
      for (const c of (e.colors || [])) {
        if (!(c in COLOR_HEX)) {
          console.error(`[supeingo:guessWords] ${e.word}: color "${c}" no está en la paleta soportada.`);
        }
      }
    }
  }

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.guessWords = DATA;
  window.SUPEINGO_CONTENT.guessCategoryIcons  = CATEGORY_ICONS;
  window.SUPEINGO_CONTENT.guessCategoryLabels = CATEGORY_LABELS;
  window.SUPEINGO_CONTENT.guessColorHex       = COLOR_HEX;
})();

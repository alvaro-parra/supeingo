// Letras del abecedario español, con palabra-ejemplo por letra.
// Sección: Aprender → Letras.
//
// Cada entrada referencia una `word` del diccionario (data/dictionary.js):
// el emoji, el svg y las sílabas se hidratan desde allí, no se duplican aquí.

(function () {
  const SCHEMA = {
    name: "alphabet",
    fields: {
      upper:   { type: "string",  required: true },
      lower:   { type: "string",  required: true },
      word:    { type: "string",  required: true }, // referencia al diccionario
      digraph: { type: "boolean", required: false }, // CH, LL
      // `spell` es lo que se ENVÍA al TTS para nombrar la letra. Sin él
      // se usa `upper`. Útil para Y → "i griega" o para forzar pronunciación
      // española en consonantes que el TTS podría leer en otro idioma.
      spell:   { type: "string",  required: false },
    },
  };

  const DATA = [
    { upper: "A",  lower: "a",  word: "ABEJA"     },
    { upper: "B",  lower: "b",  word: "BARCO"     },
    { upper: "C",  lower: "c",  word: "CASA"      },
    { upper: "CH", lower: "ch", word: "CHOCOLATE", digraph: true, spell: "che" },
    { upper: "D",  lower: "d",  word: "DEDO"      },
    { upper: "E",  lower: "e",  word: "ELEFANTE" },
    { upper: "F",  lower: "f",  word: "FLOR"      },
    { upper: "G",  lower: "g",  word: "GATO"      },
    { upper: "H",  lower: "h",  word: "HOJA"      },
    { upper: "I",  lower: "i",  word: "ISLA"      },
    { upper: "J",  lower: "j",  word: "JIRAFA"    },
    { upper: "K",  lower: "k",  word: "KIWI"      },
    { upper: "L",  lower: "l",  word: "LUNA"      },
    { upper: "LL", lower: "ll", word: "LLAVE",     digraph: true },
    { upper: "M",  lower: "m",  word: "MANO"      },
    { upper: "N",  lower: "n",  word: "NUBE"      },
    { upper: "Ñ",  lower: "ñ",  word: "PIÑA"      },
    { upper: "O",  lower: "o",  word: "OSO"       },
    { upper: "P",  lower: "p",  word: "PATO"      },
    { upper: "Q",  lower: "q",  word: "QUESO"     },
    { upper: "R",  lower: "r",  word: "RANA"      },
    { upper: "S",  lower: "s",  word: "SOL"       },
    { upper: "T",  lower: "t",  word: "TÉ"        },
    { upper: "U",  lower: "u",  word: "UVA"       },
    { upper: "V",  lower: "v",  word: "VACA"      },
    { upper: "W",  lower: "w",  word: "WIFI"      },
    { upper: "X",  lower: "x",  word: "XILÓFONO" },
    { upper: "Y",  lower: "y",  word: "YOYÓ",      spell: "i griega" },
    { upper: "Z",  lower: "z",  word: "ZORRO"     },
  ];

  // Validamos la forma del fichero ANTES de hidratar — el schema describe
  // los campos que ESTE fichero declara, no lo que se añadirá después
  // desde el diccionario.
  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("alphabet", SCHEMA, DATA);

  // Hidratar emoji/svg/sílabas desde el diccionario. Cada `word` DEBE
  // existir allí; si no, lo registramos como error en consola para
  // que se note durante el desarrollo.
  const dict = window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionaryByWord;
  if (!dict) {
    console.error("[supeingo:alphabet] dictionary no cargado — carga data/dictionary.js antes que data/alphabet.js.");
  } else {
    const missing = [];
    for (const e of DATA) {
      const d = dict[e.word];
      if (!d) { missing.push(e.word); continue; }
      if (d.emoji)     e.emoji     = d.emoji;
      if (d.svg)       e.svg       = d.svg;
      if (d.syllables) e.syllables = d.syllables;
    }
    if (missing.length) {
      console.error(`[supeingo:alphabet] palabras no encontradas en el diccionario: ${missing.join(", ")}`);
    }
  }

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.alphabet = DATA;
})();

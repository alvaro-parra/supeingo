// Familias silábicas — consonante + cada vocal, B → Z.
// Sección: Aprender → Sílabas básicas.
//
// Notas pedagógicas:
//   - Q es excepción: solo QUE, QUI (la U es muda). En el silabario
//     tradicional se enseña como 2 sílabas.
//   - Los dígrafos CH y LL aparecen aquí siempre; en el futuro
//     podríamos respetar SUPEINGO_TEACHING_CONFIG.includeDigraphs.
//   - Decisión: enseñamos C/G/H con sus 5 vocales literales para
//     priorizar la simplicidad visual; los sonidos suaves (CE/CI,
//     GE/GI, H muda) se trabajarán cuando hagamos las "reglas
//     avanzadas de separación silábica" (futuras iteraciones).

(function () {
  const SCHEMA = {
    name: "syllableFamilies",
    fields: {
      consonant: { type: "string", required: true },
      digraph: { type: "boolean", required: false },
      syllables: {
        type: "array",
        required: true,
        of: {
          type: "object",
          fields: {
            // `syllable` es lo que se muestra en la tabla.
            syllable: { type: "string", required: true },
            // `spell` (opcional) es lo que se envía al TTS cuando
            // su pronunciación no es obvia para una voz es-ES.
            spell: { type: "string", required: false },
          },
        },
      },
    },
  };

  const DATA = [
    { consonant: "B",  syllables: [{ syllable: "BA" }, { syllable: "BE", spell: "VE" }, { syllable: "BI" }, { syllable: "BO" }, { syllable: "BU" }] },
    { consonant: "C",  syllables: [{ syllable: "CA" }, { syllable: "CE" }, { syllable: "CI", spell: "ZI" }, { syllable: "CO" }, { syllable: "CU", spell: "KU" }] },
    { consonant: "CH", digraph: true, syllables: [{ syllable: "CHA" }, { syllable: "CHE" }, { syllable: "CHI" }, { syllable: "CHO" }, { syllable: "CHU" }] },
    { consonant: "D",  syllables: [{ syllable: "DA" }, { syllable: "DE" }, { syllable: "DI" }, { syllable: "DO" }, { syllable: "DU" }] },
    { consonant: "F",  syllables: [{ syllable: "FA" }, { syllable: "FE" }, { syllable: "FI" }, { syllable: "FO" }, { syllable: "FU" }] },
    { consonant: "G",  syllables: [{ syllable: "GA" }, { syllable: "GE", spell: "JEE" }, { syllable: "GI", spell: "JÍ" }, { syllable: "GO", spell: "GHO" }, { syllable: "GU" }] },
    { consonant: "H",  syllables: [{ syllable: "HA", spell: "A" }, { syllable: "HE", spell: "E" }, { syllable: "HI", spell: "I" }, { syllable: "HO", spell: "O" }, { syllable: "HU", spell: "U" }] },
    { consonant: "J",  syllables: [{ syllable: "JA" }, { syllable: "JE" }, { syllable: "JI" }, { syllable: "JO" }, { syllable: "JU", spell: "JÚ" }] },
    { consonant: "K",  syllables: [{ syllable: "KA" }, { syllable: "KE" }, { syllable: "KI" }, { syllable: "KO" }, { syllable: "KU" }] },
    { consonant: "L",  syllables: [{ syllable: "LA" }, { syllable: "LE" }, { syllable: "LI" }, { syllable: "LO" }, { syllable: "LU" }] },
    { consonant: "LL", digraph: true, syllables: [{ syllable: "LLA" }, { syllable: "LLE" }, { syllable: "LLI" }, { syllable: "LLO" }, { syllable: "LLU" }] },
    { consonant: "M",  syllables: [{ syllable: "MA" }, { syllable: "ME" }, { syllable: "MI" }, { syllable: "MO" }, { syllable: "MU" }] },
    { consonant: "N",  syllables: [{ syllable: "NA" }, { syllable: "NE" }, { syllable: "NI" }, { syllable: "NO" }, { syllable: "NU" }] },
    { consonant: "Ñ",  syllables: [{ syllable: "ÑA" }, { syllable: "ÑE" }, { syllable: "ÑI" }, { syllable: "ÑO" }, { syllable: "ÑU" }] },
    { consonant: "P",  syllables: [{ syllable: "PA" }, { syllable: "PE" }, { syllable: "PI" }, { syllable: "PO" }, { syllable: "PU" }] },
    { consonant: "Q",  syllables: [{ syllable: "QUE" }, { syllable: "QUI" }] },
    { consonant: "R",  syllables: [{ syllable: "RA" }, { syllable: "RE" }, { syllable: "RI" }, { syllable: "RO" }, { syllable: "RU" }] },
    { consonant: "S",  syllables: [{ syllable: "SA" }, { syllable: "SE" }, { syllable: "SI" }, { syllable: "SO" }, { syllable: "SU" }] },
    { consonant: "T",  syllables: [{ syllable: "TA" }, { syllable: "TE" }, { syllable: "TI" }, { syllable: "TO" }, { syllable: "TU" }] },
    { consonant: "V",  syllables: [{ syllable: "VA" }, { syllable: "VE" }, { syllable: "VI" }, { syllable: "VO" }, { syllable: "VU" }] },
    { consonant: "W",  syllables: [{ syllable: "WA" }, { syllable: "WE" }, { syllable: "WI" }, { syllable: "WO" }, { syllable: "WU" }] },
    { consonant: "X",  syllables: [{ syllable: "XA" }, { syllable: "XE" }, { syllable: "XI" }, { syllable: "XO" }, { syllable: "XU" }] },
    { consonant: "Y",  syllables: [{ syllable: "YA" }, { syllable: "YE" }, { syllable: "YI" }, { syllable: "YO" }, { syllable: "YU" }] },
    { consonant: "Z",  syllables: [{ syllable: "ZA" }, { syllable: "ZE" }, { syllable: "ZI" }, { syllable: "ZO" }, { syllable: "ZU" }] },
  ];

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("syllableFamilies", SCHEMA, DATA);

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.syllableFamilies = DATA;
})();

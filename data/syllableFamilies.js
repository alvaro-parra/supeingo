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
            // `example` (opcional) es la palabra que refuerza la
            // sílaba al pronunciarla — al pulsar suena "Ma, de mamá".
            // Mismo patrón que las letras (A → "a, de abeja"). Si no
            // hay `example`, se pronuncia la sílaba a secas.
            example: { type: "string", required: false },
          },
        },
      },
    },
  };

  const DATA = [
    // De momento sólo la familia de la M: es la más habitual al iniciar
    // la lectura (MA · ME · MI · MO · MU → MAMÁ, MESA…) y nos permite
    // probar el flujo "sílaba + palabra ejemplo" antes de poblar las
    // ~24 familias restantes.
    { consonant: "M", syllables: [
      { syllable: "MA", example: "MANO" },
      { syllable: "ME", example: "MELÓN" },
      { syllable: "MI", example: "MICRÓFONO" },
      { syllable: "MO", example: "MONO" },
      { syllable: "MU", example: "MÚSICA" },
    ] },
  ];

  window.SUPEINGO_VALIDATE(SCHEMA, DATA);
  window.SUPEINGO_REGISTER("syllableFamilies", SCHEMA, DATA);

  window.SUPEINGO_CONTENT = window.SUPEINGO_CONTENT || {};
  window.SUPEINGO_CONTENT.syllableFamilies = DATA;
})();

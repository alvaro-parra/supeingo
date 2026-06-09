// Construye la "spec" del PDF a partir de un board del generador.
// Pura, sin dependencias. Separa decisión (qué páginas, qué textos)
// de render (cómo se dibuja con jsPDF). Hace todos los datos testables
// sin tocar jsPDF.
//
// Spec resultante:
//   {
//     meta:  { title, subtitle, generatedAt, filenameSlug },
//     pages: [
//       { kind: "puzzle",   title, gridChars, wordList },
//       { kind: "solution", title, gridChars, placements, solutionLines }, // si options.includeSolution
//     ],
//   }
//
// `solutionLines[i] = { word, from:[r,c], to:[r,c], dir:{dr,dc}, len }`.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SUPEINGO_PDF_SPEC = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function todayYmd(d) {
    d = d || new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }

  // Slug ASCII-amigable. Quita acentos, deja [a-z0-9-].
  function slugify(s) {
    if (!s) return "";
    return s.toString()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  // board: { grid, placements, words, ... } del generador.
  // options:
  //   title (string, default "Sopa de letras")
  //   subtitle (string, opcional — p.ej. categoría)
  //   includeSolution (bool, default true)
  //   now (Date, opcional — para tests deterministas)
  function buildPdfSpec(board, options) {
    options = options || {};
    if (!board || !board.grid || !board.words) {
      throw new Error("buildPdfSpec: board.grid y board.words son obligatorios");
    }
    if (board.words.length === 0) {
      throw new Error("buildPdfSpec: no hay palabras colocadas, no se genera PDF vacío");
    }
    const title = options.title || "Sopa de letras";
    const subtitle = options.subtitle || "";
    const includeSolution = options.includeSolution !== false;
    const now = options.now || new Date();
    const filenameSlug = slugify(subtitle || title) || "sopa";

    const wordList = board.words.map(function (e) { return e.word; });

    const pages = [
      {
        kind: "puzzle",
        title: subtitle ? title + " — " + subtitle : title,
        gridChars: board.grid,
        wordList: wordList,
      },
    ];

    if (includeSolution) {
      const lines = board.placements.map(function (p) {
        const fromR = p.r0, fromC = p.c0;
        const toR = p.r0 + p.dir.dr * (p.len - 1);
        const toC = p.c0 + p.dir.dc * (p.len - 1);
        return {
          word: p.word,
          from: [fromR, fromC],
          to: [toR, toC],
          dir: p.dir,
          len: p.len,
        };
      });
      pages.push({
        kind: "solution",
        title: "Soluciones — " + (subtitle ? title + " — " + subtitle : title),
        gridChars: board.grid,
        placements: board.placements,
        solutionLines: lines,
      });
    }

    return {
      meta: {
        title: title,
        subtitle: subtitle,
        generatedAt: now.toISOString(),
        filenameSlug: filenameSlug,
        filename: "supeingo-sopa-" + filenameSlug + "-" + todayYmd(now) + ".pdf",
      },
      pages: pages,
    };
  }

  return {
    buildPdfSpec: buildPdfSpec,
    slugify: slugify,
  };
});

// Render del PDF a partir de una spec construida por pdf-spec.js.
// Recibe el objeto jsPDF como parámetro (no lo importa) — el caller
// inyecta la versión de la librería que prefiera. Mantiene render
// libre de imports de red y testable con jsPDF instalado vía npm.
//
// Diseño A4 vertical, márgenes 15 mm:
//   1. Título grande
//   2. Grid auto-escalado al ancho disponible
//   3. Lista de palabras en 2-4 columnas
//   4. Pie con fecha
//
// Hoja de soluciones (si existe en la spec): mismo grid con las
// letras de palabras colocadas en negrita + lista de líneas
// "PALABRA — fila X col Y → fila Z col W".
//
// Fuentes built-in de jsPDF (Helvetica + Courier) soportan Latin-1
// (Á É Í Ó Ú Ñ ¿ ¡). Para emojis o caracteres fuera de WinAnsi habría
// que embeber Noto — fuera de scope.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SUPEINGO_PDF_RENDER = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // A4 en mm
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 15;

  function renderPdf(spec, jsPDFFactory) {
    if (!spec || !spec.pages || spec.pages.length === 0) {
      throw new Error("renderPdf: spec inválida o sin páginas");
    }
    if (typeof jsPDFFactory !== "function") {
      throw new Error("renderPdf: se requiere el constructor jsPDF como segundo argumento");
    }
    const doc = new jsPDFFactory({ unit: "mm", format: "a4", orientation: "portrait" });

    for (let i = 0; i < spec.pages.length; i++) {
      if (i > 0) doc.addPage();
      const page = spec.pages[i];
      drawPage(doc, page, spec, i);
    }

    return doc;
  }

  function drawPage(doc, page, spec, pageIndex) {
    // Título
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(page.title, MARGIN, MARGIN + 8);

    // Grid
    const grid = page.gridChars;
    const rows = grid.length;
    const cols = grid[0].length;
    const availW = PAGE_W - 2 * MARGIN;
    // Reservamos espacio bajo el grid para la lista de palabras (~60mm
    // si hay muchas, ~30mm si pocas). El grid ocupa el resto.
    const reservedBottom = page.kind === "solution"
      ? Math.min(80, 20 + Math.ceil(page.solutionLines.length / 2) * 5)
      : 60;
    const availH = PAGE_H - MARGIN - 14 - reservedBottom - MARGIN;
    const cell = Math.min(availW / cols, availH / rows, 14);
    const gridW = cell * cols;
    const gridH = cell * rows;
    const gridX = (PAGE_W - gridW) / 2;
    const gridY = MARGIN + 14;

    // Caja exterior
    doc.setLineWidth(0.4);
    doc.setDrawColor(20, 20, 25);
    doc.rect(gridX, gridY, gridW, gridH);

    // Líneas internas
    doc.setLineWidth(0.2);
    doc.setDrawColor(80, 80, 90);
    for (let r = 1; r < rows; r++) {
      const y = gridY + r * cell;
      doc.line(gridX, y, gridX + gridW, y);
    }
    for (let c = 1; c < cols; c++) {
      const x = gridX + c * cell;
      doc.line(x, gridY, x, gridY + gridH);
    }

    // Letras
    doc.setFont("courier", "normal");
    const letterSize = Math.max(8, Math.min(20, cell * 1.8));
    doc.setFontSize(letterSize);
    const placedCells = page.kind === "solution" && page.placements
      ? buildPlacedCellSet(page.placements) : null;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = grid[r][c] || " ";
        const x = gridX + c * cell + cell / 2;
        const y = gridY + r * cell + cell / 2 + letterSize * 0.13;
        if (placedCells && placedCells.has(r + "," + c)) {
          doc.setFont("courier", "bold");
          doc.setTextColor(20, 20, 25);
        } else {
          doc.setFont("courier", placedCells ? "normal" : "normal");
          doc.setTextColor(placedCells ? 130 : 30, placedCells ? 130 : 30, placedCells ? 140 : 35);
        }
        doc.text(ch, x, y, { align: "center" });
      }
    }
    doc.setTextColor(20, 20, 25);

    // Contenido bajo el grid
    if (page.kind === "puzzle") {
      drawWordList(doc, page.wordList, gridY + gridH + 8);
    } else if (page.kind === "solution") {
      drawSolutionLines(doc, page.solutionLines, gridY + gridH + 8);
    }

    // Pie
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 120);
    const date = spec.meta.generatedAt
      ? new Date(spec.meta.generatedAt).toLocaleDateString("es-ES")
      : "";
    doc.text("Supeingo · " + date, MARGIN, PAGE_H - 8);
    if (spec.pages.length > 1) {
      doc.text(
        "Página " + (pageIndex + 1) + " / " + spec.pages.length,
        PAGE_W - MARGIN, PAGE_H - 8, { align: "right" }
      );
    }
    doc.setTextColor(20, 20, 25);
  }

  function buildPlacedCellSet(placements) {
    const s = new Set();
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      for (let k = 0; k < p.len; k++) {
        s.add((p.r0 + p.dir.dr * k) + "," + (p.c0 + p.dir.dc * k));
      }
    }
    return s;
  }

  function drawWordList(doc, words, top) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Encuentra estas palabras:", MARGIN, top);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    const cols = words.length > 12 ? 4 : (words.length > 6 ? 3 : 2);
    const colWidth = (PAGE_W - 2 * MARGIN) / cols;
    const rowH = 6;
    for (let i = 0; i < words.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MARGIN + col * colWidth;
      const y = top + 7 + row * rowH;
      doc.text("• " + words[i], x, y);
    }
  }

  function drawSolutionLines(doc, lines, top) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Soluciones:", MARGIN, top);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const cols = lines.length > 8 ? 2 : 1;
    const colWidth = (PAGE_W - 2 * MARGIN) / cols;
    const rowH = 5;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = MARGIN + col * colWidth;
      const y = top + 6 + row * rowH;
      const text = l.word
        + "  (fila " + (l.from[0] + 1) + " col " + (l.from[1] + 1) + " → "
        + "fila " + (l.to[0] + 1) + " col " + (l.to[1] + 1) + ")";
      doc.text(text, x, y);
    }
  }

  return { renderPdf: renderPdf };
});

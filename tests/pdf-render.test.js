// Smoke tests del render. jsPDF es opcional: si no está instalado
// (`npm i -D jspdf`), todos los tests se reportan como skip.

const test = require("node:test");
const assert = require("node:assert/strict");
const WS = require("../lib/wordsearch-generator.js");
const { buildPdfSpec } = require("../lib/pdf-spec.js");
const { renderPdf } = require("../lib/pdf-render.js");
const DICT = require("./fixtures/mini-dictionary.js");

let jsPDF = null;
try {
  jsPDF = require("jspdf").jsPDF;
} catch (_) {
  // Sin la dep, los tests se saltan.
}

const SKIP = !jsPDF;

function makeSpec() {
  const cands = WS.pickWords(DICT, {
    seed: 1, poolSize: 50, requireImage: false, allowAccents: false,
  });
  const board = WS.generateBoard({
    rows: 10, cols: 10, candidates: cands, count: 4, dirs: WS.DIRS.EASY, seed: 42,
  });
  return buildPdfSpec(board, { subtitle: "animales" });
}

test("renderPdf no lanza", { skip: SKIP && "jsPDF no instalado (npm i -D jspdf)" }, () => {
  const spec = makeSpec();
  const doc = renderPdf(spec, jsPDF);
  assert.ok(doc);
});

test("output empieza con %PDF-", { skip: SKIP && "jsPDF no instalado" }, () => {
  const spec = makeSpec();
  const doc = renderPdf(spec, jsPDF);
  const out = doc.output();
  assert.ok(out.startsWith("%PDF-"), "primer bytes del PDF: " + out.slice(0, 8));
});

test("doc.getNumberOfPages coincide con spec.pages.length", { skip: SKIP && "jsPDF no instalado" }, () => {
  const spec = makeSpec();
  const doc = renderPdf(spec, jsPDF);
  assert.equal(doc.getNumberOfPages(), spec.pages.length);
});

test("output contiene al menos una palabra del wordList", { skip: SKIP && "jsPDF no instalado" }, () => {
  const spec = makeSpec();
  const doc = renderPdf(spec, jsPDF);
  // jsPDF puede escribir el texto en formato (texto) o como hex/escape.
  // Búsqueda naive de cualquier palabra de la lista en el output crudo.
  const out = doc.output();
  const wordList = spec.pages[0].wordList;
  const matched = wordList.some((w) => out.indexOf(w) !== -1);
  assert.ok(matched, "ninguna palabra de " + wordList.join(",") + " aparece en el stream");
});

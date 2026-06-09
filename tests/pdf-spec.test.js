const test = require("node:test");
const assert = require("node:assert/strict");
const WS = require("../lib/wordsearch-generator.js");
const { buildPdfSpec, slugify } = require("../lib/pdf-spec.js");
const DICT = require("./fixtures/mini-dictionary.js");

function makeBoard(opts) {
  opts = opts || {};
  const cands = WS.pickWords(DICT, {
    seed: 1, poolSize: 50, requireImage: false, allowAccents: false,
  });
  return WS.generateBoard({
    rows: opts.rows || 10,
    cols: opts.cols || 10,
    candidates: cands,
    count: opts.count || 4,
    dirs: opts.dirs || WS.DIRS.EASY,
    seed: opts.seed || 42,
  });
}

test("spec con soluciones tiene 2 páginas", () => {
  const board = makeBoard();
  const spec = buildPdfSpec(board, { title: "Sopa", subtitle: "animales", includeSolution: true });
  assert.equal(spec.pages.length, 2);
  assert.equal(spec.pages[0].kind, "puzzle");
  assert.equal(spec.pages[1].kind, "solution");
});

test("spec sin soluciones tiene sólo 1 página puzzle", () => {
  const board = makeBoard();
  const spec = buildPdfSpec(board, { includeSolution: false });
  assert.equal(spec.pages.length, 1);
  assert.equal(spec.pages[0].kind, "puzzle");
});

test("pages[0].gridChars es board.grid", () => {
  const board = makeBoard();
  const spec = buildPdfSpec(board, {});
  assert.equal(spec.pages[0].gridChars, board.grid);
});

test("wordList preserva orden y contenido de board.words", () => {
  const board = makeBoard();
  const spec = buildPdfSpec(board, {});
  assert.deepEqual(spec.pages[0].wordList, board.words.map((e) => e.word));
});

test("solutionLines deriva from/to correctamente de r0,c0,dir,len", () => {
  const board = makeBoard();
  const spec = buildPdfSpec(board, { includeSolution: true });
  const lines = spec.pages[1].solutionLines;
  assert.equal(lines.length, board.placements.length);
  for (let i = 0; i < lines.length; i++) {
    const p = board.placements[i];
    const expectedTo = [p.r0 + p.dir.dr * (p.len - 1), p.c0 + p.dir.dc * (p.len - 1)];
    assert.deepEqual(lines[i].from, [p.r0, p.c0]);
    assert.deepEqual(lines[i].to, expectedTo);
    assert.equal(lines[i].len, p.len);
    assert.equal(lines[i].word, p.word);
  }
});

test("board sin words → error claro, no PDF vacío silencioso", () => {
  const empty = { grid: [["A"]], placements: [], words: [] };
  assert.throws(() => buildPdfSpec(empty), /vacío|palabras/);
});

test("board falsy → error", () => {
  assert.throws(() => buildPdfSpec(null), /obligatorios|board/);
  assert.throws(() => buildPdfSpec({}), /obligatorios|board/);
});

test("filename incluye slug y fecha YYYYMMDD", () => {
  const board = makeBoard();
  const spec = buildPdfSpec(board, {
    subtitle: "Animales del Zoo",
    now: new Date("2026-06-09T12:00:00Z"),
  });
  assert.equal(spec.meta.filename, "supeingo-sopa-animales-del-zoo-20260609.pdf");
});

test("slugify normaliza acentos y espacios", () => {
  assert.equal(slugify("Niños y árboles"), "ninos-y-arboles");
  assert.equal(slugify("PIÑA-tropical"), "pina-tropical");
  assert.equal(slugify("   "), "");
});

test("title compuesto incluye subtitle si existe", () => {
  const board = makeBoard();
  const a = buildPdfSpec(board, { title: "Sopa de letras", subtitle: "animales" });
  assert.match(a.pages[0].title, /Sopa de letras — animales/);
  const b = buildPdfSpec(board, { title: "Sopa de letras" });
  assert.equal(b.pages[0].title, "Sopa de letras");
});

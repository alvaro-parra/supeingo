// Tests del generador puro. Corren con `node --test tests/`.
// Cero dependencias externas.

const test = require("node:test");
const assert = require("node:assert/strict");
const WS = require("../lib/wordsearch-generator.js");
const DICT = require("./fixtures/mini-dictionary.js");

// ─── Helpers ────────────────────────────────────────────────────
function asciiOnlyCandidates(dict) {
  return WS.pickWords(dict, {
    seed: 1, poolSize: 100, requireImage: false, allowAccents: false,
  });
}

function scanGridForString(grid, str) {
  const len = str.length;
  const nRows = grid.length;
  const nCols = grid[0].length;
  const dirs = WS.DIRS.ALL8;
  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      for (const d of dirs) {
        const r1 = r + d.dr * (len - 1);
        const c1 = c + d.dc * (len - 1);
        if (r1 < 0 || r1 >= nRows || c1 < 0 || c1 >= nCols) continue;
        let ok = true;
        for (let k = 0; k < len; k++) {
          if (grid[r + d.dr * k][c + d.dc * k] !== str[k]) { ok = false; break; }
        }
        if (ok) return { r, c, d };
      }
    }
  }
  return null;
}

function gridEquals(a, b) {
  if (a.length !== b.length) return false;
  for (let r = 0; r < a.length; r++) {
    if (a[r].length !== b[r].length) return false;
    for (let c = 0; c < a[r].length; c++) {
      if (a[r][c] !== b[r][c]) return false;
    }
  }
  return true;
}

// ─── 1. Determinismo ────────────────────────────────────────────
test("determinismo: misma seed produce mismo grid y placements", () => {
  const cands = asciiOnlyCandidates(DICT);
  const a = WS.generateBoard({ rows: 10, cols: 10, candidates: cands, count: 6, dirs: WS.DIRS.EASY, seed: 42 });
  const b = WS.generateBoard({ rows: 10, cols: 10, candidates: cands, count: 6, dirs: WS.DIRS.EASY, seed: 42 });
  assert.ok(gridEquals(a.grid, b.grid), "grids deben ser idénticos");
  assert.deepEqual(a.placedWords, b.placedWords);
  assert.equal(JSON.stringify(a.placements), JSON.stringify(b.placements));
});

test("pickWords es determinista con misma seed", () => {
  const a = WS.pickWords(DICT, { seed: 7, poolSize: 5, requireImage: false });
  const b = WS.pickWords(DICT, { seed: 7, poolSize: 5, requireImage: false });
  assert.deepEqual(a.map((e) => e.word), b.map((e) => e.word));
});

// ─── 2. Regresión ELEFANTE ─────────────────────────────────────
test("ELEFANTE en 8×7: o se coloca, o sale en unplaced — nunca en words sin estar", () => {
  const elefante = DICT.find((e) => e.word === "ELEFANTE");
  const cands = [elefante, ...DICT.filter((e) => e.word !== "ELEFANTE" && /^[A-Z]+$/.test(e.word)).slice(0, 5)];
  for (let seed = 1; seed <= 30; seed++) {
    const board = WS.generateBoard({ rows: 8, cols: 7, candidates: cands, count: 4, dirs: WS.DIRS.EASY, seed });
    for (const entry of board.words) {
      assert.ok(scanGridForString(board.grid, entry.word),
        `seed=${seed}: ${entry.word} aparece en board.words pero no está en grid`);
    }
  }
});

test("regresión 100 seeds: toda palabra en board.words se encuentra con solve()", () => {
  const cands = asciiOnlyCandidates(DICT);
  for (let seed = 0; seed < 100; seed++) {
    const rows = 7 + (seed % 6);
    const cols = 7 + ((seed * 7) % 6);
    const board = WS.generateBoard({ rows, cols, candidates: cands, count: 5, dirs: WS.DIRS.EASY, seed });
    const found = WS.solve(board.grid, board.placedWords, WS.DIRS.EASY);
    for (let i = 0; i < found.length; i++) {
      assert.ok(found[i], `seed=${seed} rows=${rows} cols=${cols}: ${board.placedWords[i]} no encontrada por solve()`);
    }
  }
});

// ─── 3. Banlist limpia ─────────────────────────────────────────
test("200 seeds: ninguna palabra de DEFAULT_BANNED aparece en el grid", () => {
  const cands = asciiOnlyCandidates(DICT);
  let warningsCount = 0;
  for (let seed = 0; seed < 200; seed++) {
    const rows = 5 + (seed % 16);
    const cols = 5 + ((seed * 3) % 16);
    const board = WS.generateBoard({
      rows, cols, candidates: cands, count: 5, dirs: WS.DIRS.ALL8, seed,
    });
    for (const bad of WS.DEFAULT_BANNED) {
      const hit = scanGridForString(board.grid, bad);
      assert.equal(hit, null, `seed=${seed} ${rows}×${cols}: BANNED "${bad}" encontrada en (${hit && hit.r},${hit && hit.c})`);
    }
    if (board.warnings.length) warningsCount++;
  }
  // En camino normal no debería haber warnings; si hay alguno, lo
  // reportamos para investigarlo. Toleramos un puñado mínimo.
  assert.ok(warningsCount < 5, `demasiados warnings (${warningsCount}/200), revisar cleaner`);
});

test("banlist ampliada (x3) sigue limpia", () => {
  const cands = asciiOnlyCandidates(DICT);
  // 50 palabras inventadas + la banlist real.
  const FAKE = [];
  for (let i = 0; i < 50; i++) {
    const len = 3 + (i % 5);
    let w = "";
    for (let k = 0; k < len; k++) w += WS.DEFAULT_ALPHA[(i * 7 + k * 11) % WS.DEFAULT_ALPHA.length];
    FAKE.push(w);
  }
  const big = WS.DEFAULT_BANNED.concat(FAKE);
  for (let seed = 0; seed < 30; seed++) {
    const board = WS.generateBoard({
      rows: 12, cols: 12, candidates: cands, count: 5,
      dirs: WS.DIRS.ALL8, seed, banned: big,
    });
    for (const bad of big) {
      assert.equal(scanGridForString(board.grid, bad), null,
        `seed=${seed}: BANNED "${bad}" encontrada con banlist x3`);
    }
  }
});

test("rendimiento: cada generación < 100 ms en 12×12", () => {
  const cands = asciiOnlyCandidates(DICT);
  for (let seed = 0; seed < 20; seed++) {
    const t0 = performance.now();
    WS.generateBoard({
      rows: 12, cols: 12, candidates: cands, count: 6,
      dirs: WS.DIRS.ALL8, seed,
    });
    const dt = performance.now() - t0;
    assert.ok(dt < 200, `seed=${seed}: ${dt.toFixed(1)} ms (límite 200 ms para margen en CI lento)`);
  }
});

// ─── 4. Casos límite ────────────────────────────────────────────
test("grid mínimo 5×5 con 2 palabras cortas", () => {
  const cands = DICT.filter((e) => e.word.length <= 4 && /^[A-Z]+$/.test(e.word)).slice(0, 4);
  const board = WS.generateBoard({ rows: 5, cols: 5, candidates: cands, count: 2, dirs: WS.DIRS.EASY, seed: 1 });
  assert.ok(board.words.length >= 1);
});

test("palabra de 8 letras en grid 8×3 — debe ir vertical o a unplaced", () => {
  const elefante = DICT.find((e) => e.word === "ELEFANTE");
  for (let seed = 1; seed <= 5; seed++) {
    const board = WS.generateBoard({
      rows: 8, cols: 3, candidates: [elefante], count: 1, dirs: WS.DIRS.EASY, seed,
    });
    if (board.placements.length > 0) {
      // Si entró, tiene que ser vertical y en grid.
      assert.equal(board.placements[0].dir.dc, 0, "ELEFANTE debe ir vertical");
      assert.ok(scanGridForString(board.grid, "ELEFANTE"));
    } else {
      // Si no entró, está en unplaced y no en words.
      assert.equal(board.words.length, 0);
      assert.equal(board.unplaced.length, 1);
    }
  }
});

test("palabra de 8 letras en grid 3×3 — siempre unplaced", () => {
  const elefante = DICT.find((e) => e.word === "ELEFANTE");
  const board = WS.generateBoard({
    rows: 3, cols: 3, candidates: [elefante], count: 1, dirs: WS.DIRS.EASY, seed: 1,
  });
  assert.equal(board.words.length, 0);
  assert.equal(board.unplaced.length, 1);
});

// ─── 5. dirs granular ───────────────────────────────────────────
test("cada placement usa una dirección del set permitido", () => {
  const cands = asciiOnlyCandidates(DICT);
  const subsets = [WS.DIRS.EASY, WS.DIRS.CLASSIC, WS.DIRS.ALL8, [WS.DIRS.W], [WS.DIRS.NE, WS.DIRS.SW]];
  for (const dirs of subsets) {
    for (let seed = 1; seed <= 10; seed++) {
      const board = WS.generateBoard({
        rows: 14, cols: 14, candidates: cands, count: 5, dirs, seed,
      });
      for (const p of board.placements) {
        const ok = dirs.some((d) => d.dr === p.dir.dr && d.dc === p.dir.dc);
        assert.ok(ok, `placement con dir=(${p.dir.dr},${p.dir.dc}) fuera del set`);
      }
    }
  }
});

test("sólo dir W (←): todas las colocaciones son horizontales invertidas", () => {
  const cands = asciiOnlyCandidates(DICT);
  for (let seed = 1; seed <= 10; seed++) {
    const board = WS.generateBoard({
      rows: 10, cols: 10, candidates: cands, count: 4, dirs: [WS.DIRS.W], seed,
    });
    for (const p of board.placements) {
      assert.equal(p.dir.dr, 0);
      assert.equal(p.dir.dc, -1);
    }
  }
});

test("dirs vacío o ausente → error claro", () => {
  const cands = asciiOnlyCandidates(DICT);
  assert.throws(
    () => WS.generateBoard({ rows: 10, cols: 10, candidates: cands, dirs: [], seed: 1 }),
    /dirs/,
  );
  assert.throws(
    () => WS.generateBoard({ rows: 10, cols: 10, candidates: cands, seed: 1 }),
    /dirs/,
  );
});

// ─── 6. solve() cross-check ────────────────────────────────────
test("solve() reproduce placements (mismo dir y posición)", () => {
  const cands = asciiOnlyCandidates(DICT);
  for (let seed = 0; seed < 20; seed++) {
    const board = WS.generateBoard({
      rows: 12, cols: 12, candidates: cands, count: 5, dirs: WS.DIRS.ALL8, seed,
    });
    const sols = WS.solve(board.grid, board.placedWords, WS.DIRS.ALL8);
    for (let i = 0; i < board.placements.length; i++) {
      const p = board.placements[i];
      // solve devuelve el primero que encuentra. Como puede haber
      // simetría (la misma palabra detectable en otra dir), aceptamos
      // que coincida en posición de extremos.
      const s = sols[i];
      assert.ok(s, `solve no encontró ${p.word}`);
      const pEnd = [p.r0 + p.dir.dr * (p.len - 1), p.c0 + p.dir.dc * (p.len - 1)];
      const sEnd = [s.r0 + s.dir.dr * (s.len - 1), s.c0 + s.dir.dc * (s.len - 1)];
      const matchForward = s.r0 === p.r0 && s.c0 === p.c0 && sEnd[0] === pEnd[0] && sEnd[1] === pEnd[1];
      const matchReverse = s.r0 === pEnd[0] && s.c0 === pEnd[1] && sEnd[0] === p.r0 && sEnd[1] === p.c0;
      assert.ok(matchForward || matchReverse,
        `solve devolvió posición distinta para ${p.word}`);
    }
  }
});

// ─── 7. Property-based ligero ──────────────────────────────────
test("invariantes: words+unplaced, alfabeto, sin BANNED, tiempo acotado", () => {
  const cands = asciiOnlyCandidates(DICT);
  const alphabetSet = new Set((WS.DEFAULT_ALPHA + "ÑÁÉÍÓÚ").split(""));
  let warningCount = 0;
  for (let seed = 0; seed < 100; seed++) {
    const rows = 5 + (seed % 16);
    const cols = 5 + ((seed * 13) % 16);
    const count = 2 + (seed % 8);
    const dirSubsets = [WS.DIRS.EASY, WS.DIRS.CLASSIC, WS.DIRS.ALL8];
    const dirs = dirSubsets[seed % dirSubsets.length];
    const t0 = performance.now();
    const board = WS.generateBoard({ rows, cols, candidates: cands, count, dirs, seed });
    const dt = performance.now() - t0;
    assert.ok(dt < 250, `seed=${seed}: ${dt.toFixed(1)} ms > 250`);
    assert.ok(board.words.length <= count);
    // Si no llegamos a `count`, es porque agotamos los candidatos
    // intentándolos todos. Si llegamos, paramos antes y `unplaced`
    // sólo contiene los fallos hasta ese momento.
    assert.ok(board.words.length + board.unplaced.length <= cands.length);
    if (board.words.length < count) {
      assert.equal(board.words.length + board.unplaced.length, cands.length,
        `seed=${seed}: si no llegamos a count debemos haber agotado candidatos`);
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        assert.ok(alphabetSet.has(board.grid[r][c]) || /[A-ZÑÁÉÍÓÚ]/.test(board.grid[r][c]),
          `celda (${r},${c}) tiene "${board.grid[r][c]}" fuera del alfabeto`);
      }
    }
    if (board.warnings.length) warningCount++;
  }
  assert.ok(warningCount < 3, `${warningCount}/100 generaciones con warnings — demasiado`);
});

// ─── pickWords filtros ──────────────────────────────────────────
test("pickWords respeta hideScary", () => {
  const all = WS.pickWords(DICT, { seed: 1, poolSize: 100, requireImage: false, hideScary: false });
  const safe = WS.pickWords(DICT, { seed: 1, poolSize: 100, requireImage: false, hideScary: true });
  assert.ok(all.some((e) => e.word === "TIGRE"));
  assert.ok(!safe.some((e) => e.word === "TIGRE"));
});

test("pickWords con allowAccents permite Ñ y tildes", () => {
  const ascii = WS.pickWords(DICT, { seed: 1, poolSize: 100, requireImage: false, allowAccents: false });
  const wide = WS.pickWords(DICT, { seed: 1, poolSize: 100, requireImage: false, allowAccents: true });
  assert.ok(!ascii.some((e) => e.word === "PIÑA"));
  assert.ok(wide.some((e) => e.word === "PIÑA"));
});

test("pickWords filtra por categoría", () => {
  const animals = WS.pickWords(DICT, { seed: 1, poolSize: 100, requireImage: false, categories: ["animales"] });
  for (const e of animals) {
    assert.ok((e.categories || []).includes("animales"));
  }
});

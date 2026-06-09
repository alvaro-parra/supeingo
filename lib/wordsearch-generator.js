// Generador puro de sopas de letras — reutilizable por el juego del niño
// (components/WordSearch.jsx) y por el generador en PDF para profesoras
// (components/TeacherTools.jsx).
//
// UMD manual: en navegador expone `window.SUPEINGO_WS`; en Node se carga
// con `require("./lib/wordsearch-generator.js")`. Sin transpilación.
//
// Todo se inyecta por parámetro: el diccionario, la banlist, el alfabeto
// de relleno y las direcciones permitidas. El módulo no toca `window`.

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SUPEINGO_WS = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // ─── PRNG reproducible (Mulberry32) ───────────────────────────
  function makeRnd(seed) {
    let s = seed | 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  }

  // ─── Direcciones canónicas + presets ──────────────────────────
  const DIRS = {
    E:  { dr:  0, dc:  1 },
    W:  { dr:  0, dc: -1 },
    S:  { dr:  1, dc:  0 },
    N:  { dr: -1, dc:  0 },
    SE: { dr:  1, dc:  1 },
    NW: { dr: -1, dc: -1 },
    SW: { dr:  1, dc: -1 },
    NE: { dr: -1, dc:  1 },
  };
  DIRS.EASY    = [DIRS.E, DIRS.S];
  DIRS.CLASSIC = [DIRS.E, DIRS.S, DIRS.SE, DIRS.NE];
  DIRS.ALL8    = [DIRS.E, DIRS.W, DIRS.S, DIRS.N, DIRS.SE, DIRS.NW, DIRS.SW, DIRS.NE];

  // Defaults equivalentes a los de WordSearch.jsx antes del refactor.
  const DEFAULT_ALPHA = "ABCDEFGHIJLMNOPQRSTUVXYZ";
  const DEFAULT_BANNED = [
    "PUTA","PUTO","PUTAS","PUTOS",
    "MIERDA","CACA",
    "CULO","CULOS",
    "TETA","TETAS",
    "POLLA","POLLAS",
    "JODER","JODE",
    "PEDO","PEDOS",
    "FOLLA","FOLLAR",
    "PIPI",
    "PENE",
    "VAGINA",
  ];

  // ─── Selección de palabras del diccionario ────────────────────
  // Devuelve un pool barajado y filtrado. `dict` es el array de entradas
  // del diccionario inyectado por el caller (no se asume window).
  function pickWords(dict, opts) {
    opts = opts || {};
    const seed = opts.seed != null ? opts.seed : 1;
    const cats = opts.categories ? new Set(opts.categories) : null;
    const hideScary = !!opts.hideScary;
    const minLen = opts.minLen != null ? opts.minLen : 3;
    const maxLen = opts.maxLen != null ? opts.maxLen : 12;
    const poolSize = opts.poolSize != null ? opts.poolSize : 24;
    const requireImage = opts.requireImage !== false; // default true (compat)
    const allowAccents = !!opts.allowAccents;
    const wordRegex = allowAccents ? /^[A-ZÑÁÉÍÓÚ]+$/ : /^[A-Z]+$/;
    const pool = (dict || []).filter(function (e) {
      if (!e || typeof e.word !== "string") return false;
      if (cats && !(e.categories || []).some(function (c) { return cats.has(c); })) return false;
      if (e.word.length < minLen || e.word.length > maxLen) return false;
      if (requireImage && !e.image && !e.emoji) return false;
      if (!wordRegex.test(e.word)) return false;
      if (hideScary && (e.tags || []).indexOf("miedo") !== -1) return false;
      return true;
    });
    const rnd = makeRnd(seed);
    return shuffle(pool, rnd).slice(0, poolSize);
  }

  // ─── Buscador (también usado para la hoja de soluciones) ──────
  // Escanea el grid en las 8 direcciones por defecto. Devuelve el
  // primer placement encontrado para cada palabra (orden de búsqueda
  // determinista row-major, dir-major).
  function solve(grid, words, dirs) {
    const SCAN = dirs || DIRS.ALL8;
    const nRows = grid.length;
    const nCols = grid[0].length;
    const out = [];
    for (let wi = 0; wi < words.length; wi++) {
      const word = words[wi];
      const len = word.length;
      let found = null;
      outer:
      for (let r = 0; r < nRows && !found; r++) {
        for (let c = 0; c < nCols && !found; c++) {
          for (let di = 0; di < SCAN.length; di++) {
            const d = SCAN[di];
            const r1 = r + d.dr * (len - 1);
            const c1 = c + d.dc * (len - 1);
            if (r1 < 0 || r1 >= nRows || c1 < 0 || c1 >= nCols) continue;
            let ok = true;
            for (let k = 0; k < len; k++) {
              if (grid[r + d.dr * k][c + d.dc * k] !== word[k]) { ok = false; break; }
            }
            if (ok) { found = { word: word, r0: r, c0: c, dir: d, len: len }; break outer; }
          }
        }
      }
      out.push(found);
    }
    return out;
  }

  // ─── Escaneos de banlist ─────────────────────────────────────
  // Comprueba si alguna palabra BANNED cruza la celda (r,c).
  // Local: O(|banned| × 8 × maxLen). NO recorre el grid entero.
  function cellMakesBanned(grid, r, c, banned) {
    const nRows = grid.length;
    const nCols = grid[0].length;
    const all8 = DIRS.ALL8;
    const ch = grid[r][c];
    if (ch == null) return null;
    for (let bi = 0; bi < banned.length; bi++) {
      const bad = banned[bi];
      const len = bad.length;
      // Para cada posición k donde (r,c) podría estar dentro de bad.
      for (let k = 0; k < len; k++) {
        if (bad[k] !== ch) continue;
        for (let di = 0; di < 8; di++) {
          const d = all8[di];
          const r0 = r - d.dr * k;
          const c0 = c - d.dc * k;
          const r1 = r0 + d.dr * (len - 1);
          const c1 = c0 + d.dc * (len - 1);
          if (r0 < 0 || r0 >= nRows || c0 < 0 || c0 >= nCols) continue;
          if (r1 < 0 || r1 >= nRows || c1 < 0 || c1 >= nCols) continue;
          let match = true;
          for (let kk = 0; kk < len; kk++) {
            if (grid[r0 + d.dr * kk][c0 + d.dc * kk] !== bad[kk]) { match = false; break; }
          }
          if (match) return { r: r0, c: c0, d: d, len: len, bad: bad };
        }
      }
    }
    return null;
  }

  // Capa 1: ¿colocar la palabra crearía una BANNED que cruce alguna
  // de las celdas NUEVAS? Iteramos cada nueva celda con el checker
  // local — barato y completo.
  function newCellsMakeBanned(grid, newCells, banned) {
    let result = null;
    newCells.forEach(function (key) {
      if (result) return;
      const parts = key.split(",");
      const r = +parts[0], c = +parts[1];
      result = cellMakesBanned(grid, r, c, banned) || result;
    });
    return result;
  }

  // Capa 3: escaneo full grid (sólo para verificación final).
  function gridHasBanned(grid, banned) {
    const nRows = grid.length;
    const nCols = grid[0].length;
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        if (cellMakesBanned(grid, r, c, banned)) return true;
      }
    }
    return false;
  }

  // ─── cleanBadWords (fallback histórico) ───────────────────────
  // Capa 2 ya cubre la mayoría de casos; este cleaner queda como
  // utilidad para casos donde el caller quiera intentar limpieza
  // post-hoc (tests, debugging). NO se usa en `generateBoard`.
  function cleanBadWords(grid, placements, rnd, opts) {
    opts = opts || {};
    const banned = opts.banned || DEFAULT_BANNED;
    const alpha = opts.alpha || DEFAULT_ALPHA;
    const placed = new Set();
    for (let i = 0; i < placements.length; i++) {
      const p = placements[i];
      for (let k = 0; k < p.len; k++) {
        placed.add((p.r0 + p.dir.dr * k) + "," + (p.c0 + p.dir.dc * k));
      }
    }
    function findAnywhere() {
      const nRows = grid.length;
      const nCols = grid[0].length;
      for (let r = 0; r < nRows; r++) {
        for (let c = 0; c < nCols; c++) {
          const hit = cellMakesBanned(grid, r, c, banned);
          if (hit) return hit;
        }
      }
      return null;
    }
    for (let iter = 0; iter < 300; iter++) {
      const hit = findAnywhere();
      if (!hit) return true;
      const cands = [];
      for (let k = 0; k < hit.len; k++) {
        const rr = hit.r + hit.d.dr * k;
        const cc = hit.c + hit.d.dc * k;
        if (!placed.has(rr + "," + cc)) cands.push({ rr: rr, cc: cc });
      }
      if (cands.length === 0) return false;
      const pick = cands[Math.floor(rnd() * cands.length)];
      const old = grid[pick.rr][pick.cc];
      let neu = old;
      for (let t = 0; t < 12 && neu === old; t++) {
        neu = alpha[Math.floor(rnd() * alpha.length)];
      }
      grid[pick.rr][pick.cc] = neu;
    }
    return !findAnywhere();
  }

  // ─── generateBoard (corazón) ──────────────────────────────────
  // Coloca las palabras más largas primero (menos posiciones válidas).
  // Capa 1: pre-check de banlist en cada colocación.
  // Capa 2: relleno consciente con backtracking acotado.
  // Capa 3: verificación final + warnings.
  function generateBoard(opts) {
    const rows = opts.rows;
    const cols = opts.cols;
    const candidates = opts.candidates || [];
    const seed = opts.seed != null ? opts.seed : 1;
    const count = opts.count != null ? opts.count : candidates.length;
    const dirs = opts.dirs;
    const banned = opts.banned || DEFAULT_BANNED;
    const alpha = opts.alpha || DEFAULT_ALPHA;
    const maxFillMs = opts.maxFillMs != null ? opts.maxFillMs : 500;
    if (!dirs || !Array.isArray(dirs) || dirs.length === 0) {
      throw new Error("generateBoard: `dirs` debe ser un array no vacío de vectores {dr,dc}");
    }
    if (!rows || !cols) {
      throw new Error("generateBoard: `rows` y `cols` deben ser > 0");
    }

    const rnd = makeRnd(seed);
    const grid = [];
    for (let r = 0; r < rows; r++) {
      const row = new Array(cols);
      for (let c = 0; c < cols; c++) row[c] = null;
      grid.push(row);
    }
    const placements = [];
    const placedEntries = [];
    const unplaced = [];

    // tryPlace devuelve true si colocó (mutando grid+placements), o
    // false si tras `attempts` intentos no encajó.
    function tryPlace(word) {
      const letters = word.split("");
      const len = letters.length;
      const ATTEMPTS = 500;
      for (let i = 0; i < ATTEMPTS; i++) {
        const dir = dirs[Math.floor(rnd() * dirs.length)];
        const minR = dir.dr < 0 ? len - 1 : 0;
        const maxR = dir.dr > 0 ? rows - len : rows - 1;
        const minC = dir.dc < 0 ? len - 1 : 0;
        const maxC = dir.dc > 0 ? cols - len : cols - 1;
        if (minR > maxR || minC > maxC) continue;
        const r0 = minR + Math.floor(rnd() * (maxR - minR + 1));
        const c0 = minC + Math.floor(rnd() * (maxC - minC + 1));
        // Compatibilidad: las celdas o vacías o con la misma letra.
        const newCells = new Set();
        let ok = true;
        for (let k = 0; k < len; k++) {
          const r = r0 + dir.dr * k;
          const c = c0 + dir.dc * k;
          const cell = grid[r][c];
          if (cell !== null && cell !== letters[k]) { ok = false; break; }
          if (cell === null) newCells.add(r + "," + c);
        }
        if (!ok) continue;

        // Capa 1: simular el placement y comprobar que no nace una BANNED.
        for (let k = 0; k < len; k++) {
          grid[r0 + dir.dr * k][c0 + dir.dc * k] = letters[k];
        }
        if (newCellsMakeBanned(grid, newCells, banned)) {
          // Rollback de las celdas nuevas y seguir probando.
          newCells.forEach(function (key) {
            const parts = key.split(",");
            grid[+parts[0]][+parts[1]] = null;
          });
          continue;
        }
        placements.push({ word: word, r0: r0, c0: c0, dir: dir, len: len });
        return true;
      }
      return false;
    }

    // Colocar candidatos: largos primero, hasta `count`.
    const sorted = candidates.slice().sort(function (a, b) {
      return b.word.length - a.word.length;
    });
    for (let i = 0; i < sorted.length; i++) {
      const w = sorted[i];
      if (placedEntries.length >= count) break;
      if (tryPlace(w.word)) placedEntries.push(w);
      else unplaced.push(w);
    }

    // Capa 2: relleno consciente con backtracking.
    // Recorremos celdas vacías row-major. Para cada una, probamos
    // letras de `alpha` en orden barajado; aceptamos la primera que NO
    // complete ninguna BANNED considerando el grid actual.
    const empties = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === null) empties.push([r, c]);
      }
    }
    const t0 = (typeof performance !== "undefined" && performance.now)
      ? performance.now() : Date.now();
    const orders = empties.map(function () { return shuffle(alpha.split(""), rnd); });
    const tried = empties.map(function () { return 0; });
    const warnings = [];
    let bt = 0;
    const BT_LIMIT = 200;
    let idx = 0;
    let timedOut = false;
    while (idx < empties.length) {
      const now = (typeof performance !== "undefined" && performance.now)
        ? performance.now() : Date.now();
      if (now - t0 > maxFillMs) { timedOut = true; break; }
      const cell = empties[idx];
      const r = cell[0], c = cell[1];
      const order = orders[idx];
      let placed = false;
      while (tried[idx] < order.length) {
        const ch = order[tried[idx]++];
        grid[r][c] = ch;
        if (!cellMakesBanned(grid, r, c, banned)) {
          placed = true;
          break;
        }
      }
      if (placed) {
        idx++;
      } else {
        grid[r][c] = null;
        tried[idx] = 0;
        // reordenamos para variar en el siguiente intento
        orders[idx] = shuffle(alpha.split(""), rnd);
        bt++;
        if (bt > BT_LIMIT || idx === 0) {
          // Sin solución encontrada en el límite — relleno greedy
          // del resto sin chequeo, para devolver siempre un grid.
          for (let j = idx; j < empties.length; j++) {
            const e = empties[j];
            if (grid[e[0]][e[1]] === null) {
              grid[e[0]][e[1]] = alpha[Math.floor(rnd() * alpha.length)];
            }
          }
          warnings.push("backtrack_limit");
          break;
        }
        idx--;
      }
    }

    if (timedOut) {
      // Rellena lo que falte sin chequear y avisa.
      for (let j = 0; j < empties.length; j++) {
        const e = empties[j];
        if (grid[e[0]][e[1]] === null) {
          grid[e[0]][e[1]] = alpha[Math.floor(rnd() * alpha.length)];
        }
      }
      warnings.push("timeout");
    }

    // Capa 3: verificación final. Si algo se coló (cruce inevitable
    // entre palabras colocadas, por ejemplo), marcamos `dirty_fill`.
    if (gridHasBanned(grid, banned)) {
      warnings.push("dirty_fill");
    }

    const placedWords = placedEntries.map(function (e) { return e.word; });
    return {
      grid: grid,
      placements: placements,
      words: placedEntries,
      placedWords: placedWords,
      unplaced: unplaced,
      warnings: warnings,
    };
  }

  // ─── Helpers de selección (movidos desde WordSearch.jsx) ──────
  // Línea recta exacta entre dos celdas en una de las 8 direcciones.
  function linePath(a, b) {
    if (a.r === b.r && a.c === b.c) return [a];
    const adr = Math.abs(b.r - a.r);
    const adc = Math.abs(b.c - a.c);
    if (a.r !== b.r && a.c !== b.c && adr !== adc) return null;
    const dr = Math.sign(b.r - a.r);
    const dc = Math.sign(b.c - a.c);
    const len = Math.max(adr, adc);
    const path = [];
    for (let i = 0; i <= len; i++) path.push({ r: a.r + dr * i, c: a.c + dc * i });
    return path;
  }

  function validatePath(start, end, board, foundSet) {
    const path = linePath(start, end);
    if (!path || path.length < 2) return null;
    const a = path[0];
    const b = path[path.length - 1];
    for (let i = 0; i < board.placements.length; i++) {
      const p = board.placements[i];
      if (foundSet && foundSet.has(p.word)) continue;
      if (path.length !== p.len) continue;
      const pa = { r: p.r0, c: p.c0 };
      const pb = {
        r: p.r0 + p.dir.dr * (p.len - 1),
        c: p.c0 + p.dir.dc * (p.len - 1),
      };
      const forward = a.r === pa.r && a.c === pa.c && b.r === pb.r && b.c === pb.c;
      const reverse = a.r === pb.r && a.c === pb.c && b.r === pa.r && b.c === pa.c;
      if (forward || reverse) return p;
    }
    return null;
  }

  return {
    makeRnd: makeRnd,
    shuffle: shuffle,
    pickWords: pickWords,
    generateBoard: generateBoard,
    solve: solve,
    cleanBadWords: cleanBadWords,
    cellMakesBanned: cellMakesBanned,
    gridHasBanned: gridHasBanned,
    linePath: linePath,
    validatePath: validatePath,
    DIRS: DIRS,
    DEFAULT_BANNED: DEFAULT_BANNED,
    DEFAULT_ALPHA: DEFAULT_ALPHA,
  };
});

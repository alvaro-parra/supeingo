// "Sopa de letras" — encuentra palabras escondidas en una cuadrícula.
//
// Dos pantallas internas:
//   - Palabras: lista grande de las 5 palabras objetivo (icono + sílabas).
//   - Sopa: cuadrícula 7×8 + tira de iconos en pequeño arriba (botón a Palabras).
//
// Selección por arrastre Y por dos taps. Direcciones de colocación
// → ↓ ↘ ↗ (siempre avanzando a la derecha); aceptamos el arrastre
// inverso porque selecciona la misma palabra al revés.
//
// Pool: animales del diccionario, len ≤ 8, sólo A–Z (sin Ñ ni tildes).

const WS_CATEGORIES = ["animales"];
const WS_WORD_COUNT = 5;
const WS_MAX_LEN = 8;
const WS_GRID = { rows: 8, cols: 7 };

// Direcciones de COLOCACIÓN — sólo "hacia la derecha".
const WS_DIRS = [
  { dr:  0, dc: 1 },  // →
  { dr:  1, dc: 0 },  // ↓
  { dr:  1, dc: 1 },  // ↘
  { dr: -1, dc: 1 },  // ↗
];

// Direcciones para escaneo de malsonantes — las 8 (incluye invertidas).
const WS_SCAN_DIRS = [
  { dr:  0, dc:  1 }, { dr:  0, dc: -1 },
  { dr:  1, dc:  0 }, { dr: -1, dc:  0 },
  { dr:  1, dc:  1 }, { dr: -1, dc: -1 },
  { dr:  1, dc: -1 }, { dr: -1, dc:  1 },
];

// Alfabeto de relleno — sin K, W (raras en español) ni Ñ/tildes
// (las celdas representan letras del alfabeto enseñado).
const WS_ALPHA = "ABCDEFGHIJLMNOPQRSTUVXYZ";

// Palabras a evitar en el relleno aleatorio. Sólo se mutan letras
// de relleno; nunca letras de palabras colocadas. Ampliable según
// vayan apareciendo casos durante el playtest.
const WS_BANNED = [
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

// CSS scoped al juego — keyframes que no están en base.css.
(function _wsInjectStyles() {
  if (typeof document === "undefined" || document.getElementById("ws-styles")) return;
  const s = document.createElement("style");
  s.id = "ws-styles";
  s.textContent = `
    @keyframes ws-pulse {
      0%, 100% { transform: scale(1.06); }
      50%      { transform: scale(1.12); }
    }
  `;
  document.head.appendChild(s);
})();

// ─── PRNG reproducible (Mulberry32) ───────────────────────────
function _wsMakeRnd(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _wsShuffle(arr, rnd) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ─── Selección de palabras del diccionario ────────────────────
function _wsPickWords(seed, opts) {
  const cats = new Set(WS_CATEGORIES);
  const hideScary = !!(opts && opts.hideScary);
  const dict = (window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionary) || [];
  const pool = dict.filter(e =>
    (e.categories || []).some(c => cats.has(c))
    && e.word.length >= 3
    && e.word.length <= WS_MAX_LEN
    && (e.svg || e.emoji || e.image)
    && /^[A-Z]+$/.test(e.word)
    && !(hideScary && (e.tags || []).includes("miedo"))
  );
  const rnd = _wsMakeRnd(seed);
  return _wsShuffle(pool, rnd).slice(0, WS_WORD_COUNT);
}

// ─── Generación del tablero ───────────────────────────────────
function _wsGenerateBoard(nRows, nCols, words, seed) {
  const rnd = _wsMakeRnd(seed);
  const grid = Array.from({ length: nRows }, () => Array(nCols).fill(null));
  const placements = [];

  function tryPlace(word) {
    const letters = word.split("");
    const len = letters.length;
    for (let i = 0; i < 500; i++) {
      const dir = WS_DIRS[Math.floor(rnd() * WS_DIRS.length)];
      const minR = dir.dr < 0 ? len - 1 : 0;
      const maxR = dir.dr > 0 ? nRows - len : nRows - 1;
      const minC = dir.dc < 0 ? len - 1 : 0;
      const maxC = dir.dc > 0 ? nCols - len : nCols - 1;
      if (minR > maxR || minC > maxC) continue;
      const r0 = minR + Math.floor(rnd() * (maxR - minR + 1));
      const c0 = minC + Math.floor(rnd() * (maxC - minC + 1));
      let ok = true;
      for (let k = 0; k < len; k++) {
        const r = r0 + dir.dr * k;
        const c = c0 + dir.dc * k;
        if (grid[r][c] !== null && grid[r][c] !== letters[k]) { ok = false; break; }
      }
      if (!ok) continue;
      for (let k = 0; k < len; k++) {
        const r = r0 + dir.dr * k;
        const c = c0 + dir.dc * k;
        grid[r][c] = letters[k];
      }
      placements.push({ word, r0, c0, dir, len });
      return true;
    }
    return false;
  }

  for (const w of words) tryPlace(w.word);

  for (let r = 0; r < nRows; r++) {
    for (let c = 0; c < nCols; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = WS_ALPHA[Math.floor(rnd() * WS_ALPHA.length)];
      }
    }
  }

  _wsCleanBadWords(grid, placements, rnd);
  return { grid, placements };
}

// Busca apariciones de WS_BANNED en las 8 direcciones y muta una
// letra de relleno (no perteneciente a una palabra colocada) hasta
// dejar la cuadrícula limpia.
function _wsCleanBadWords(grid, placements, rnd) {
  const nRows = grid.length;
  const nCols = grid[0].length;
  const placed = new Set();
  for (const p of placements) {
    for (let k = 0; k < p.len; k++) {
      placed.add(`${p.r0 + p.dir.dr * k},${p.c0 + p.dir.dc * k}`);
    }
  }
  for (let iter = 0; iter < 300; iter++) {
    let hit = null;
    outer:
    for (let r = 0; r < nRows; r++) {
      for (let c = 0; c < nCols; c++) {
        for (const d of WS_SCAN_DIRS) {
          for (const bad of WS_BANNED) {
            const len = bad.length;
            const r1 = r + d.dr * (len - 1);
            const c1 = c + d.dc * (len - 1);
            if (r1 < 0 || r1 >= nRows || c1 < 0 || c1 >= nCols) continue;
            let match = true;
            for (let k = 0; k < len; k++) {
              if (grid[r + d.dr * k][c + d.dc * k] !== bad[k]) { match = false; break; }
            }
            if (match) { hit = { r, c, d, len, bad }; break outer; }
          }
        }
      }
    }
    if (!hit) return;
    const cands = [];
    for (let k = 0; k < hit.len; k++) {
      const rr = hit.r + hit.d.dr * k;
      const cc = hit.c + hit.d.dc * k;
      if (!placed.has(`${rr},${cc}`)) cands.push({ rr, cc });
    }
    if (cands.length === 0) break;
    const pick = cands[Math.floor(rnd() * cands.length)];
    const old = grid[pick.rr][pick.cc];
    let neu = old;
    for (let t = 0; t < 12 && neu === old; t++) {
      neu = WS_ALPHA[Math.floor(rnd() * WS_ALPHA.length)];
    }
    grid[pick.rr][pick.cc] = neu;
  }
}

// ─── Lógica de selección ──────────────────────────────────────
function _wsSnapPath(a, b, nRows, nCols) {
  const dr = b.r - a.r, dc = b.c - a.c;
  if (dr === 0 && dc === 0) return [a];
  const adr = Math.abs(dr), adc = Math.abs(dc);
  let sr, sc, len;
  if (adr > adc * 2.5)      { sr = Math.sign(dr); sc = 0;             len = adr; }
  else if (adc > adr * 2.5) { sr = 0;             sc = Math.sign(dc); len = adc; }
  else                       { sr = Math.sign(dr); sc = Math.sign(dc); len = Math.max(adr, adc); }
  const path = [];
  for (let i = 0; i <= len; i++) {
    const r = a.r + sr * i;
    const c = a.c + sc * i;
    if (r < 0 || r >= nRows || c < 0 || c >= nCols) break;
    path.push({ r, c });
  }
  return path;
}

function _wsValidatePath(start, end, board, foundSet) {
  const nRows = board.grid.length;
  const nCols = board.grid[0].length;
  const path = _wsSnapPath(start, end, nRows, nCols);
  if (path.length < 2) return null;
  // El path debe coincidir EXACTAMENTE con los extremos de una
  // colocación (mismo arranque/final, o invertido). Antes comparaba
  // sólo el string deletreado, lo que daba falsos positivos cuando
  // el relleno aleatorio formaba por casualidad la palabra objetivo.
  const a = path[0];
  const b = path[path.length - 1];
  for (const p of board.placements) {
    if (foundSet.has(p.word)) continue;
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

// ─────────────────────────────────────────────────────────────
// WordSearch — componente raíz del juego
// ─────────────────────────────────────────────────────────────
function WordSearch({ onBack, debug = false, hideScary = false }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const words = useMemo(() => _wsPickWords(seed, { hideScary }), [seed, hideScary]);
  const board = useMemo(
    () => _wsGenerateBoard(WS_GRID.rows, WS_GRID.cols, words, seed + 1),
    [words, seed]
  );
  const [found, setFound] = useState(() => new Set());
  const [reveal, setReveal] = useState(null);
  const [screen, setScreen] = useState("palabras");
  const [confettiOn, setConfettiOn] = useState(false);
  const revealTimerRef = useRef(null);
  const confettiTimerRef = useRef(null);

  const handleFound = useCallback((wordStr) => {
    setFound(prev => {
      if (prev.has(wordStr)) return prev;
      return new Set([...prev, wordStr]);
    });
    const entry = words.find(x => x.word === wordStr);
    if (!entry) return;
    playFeedback("correct");
    setReveal(entry);
    setConfettiOn(true);
    setTimeout(() => speak(wordStr), 250);
    if (revealTimerRef.current) clearTimeout(revealTimerRef.current);
    revealTimerRef.current = setTimeout(() => setReveal(null), 1500);
    if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
    confettiTimerRef.current = setTimeout(() => setConfettiOn(false), 1100);
  }, [words]);

  const allFound = found.size === words.length;
  const sessionDone = allFound && reveal === null;

  const restart = () => {
    setFound(new Set());
    setReveal(null);
    setConfettiOn(false);
    setSeed(Math.floor(Math.random() * 1e9));
    setScreen("palabras");
  };

  if (sessionDone) {
    return <WordSearchSessionComplete words={words} onPlayAgain={restart} onBack={onBack}/>;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-5)" }}>
      <div className="bg-decor"/>
      <Confetti active={confettiOn}/>

      {screen === "palabras" ? (
        <WSPalabrasScreen
          words={words}
          found={found}
          onBack={onBack}
          onGoToSopa={() => setScreen("sopa")}
        />
      ) : (
        <WSSopaScreen
          words={words}
          board={board}
          found={found}
          onFound={handleFound}
          onBack={onBack}
          onGoToPalabras={() => setScreen("palabras")}
        />
      )}

      {reveal && <MatchReveal entry={reveal}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pantalla Palabras — lista + CTA a la sopa
// ─────────────────────────────────────────────────────────────
function WSPalabrasScreen({ words, found, onBack, onGoToSopa }) {
  return (
    <>
      <ScreenHeader
        title="Animales"
        onBack={onBack}
        right={<ProgressChip current={found.size} total={words.length}/>}
      />
      <div style={{
        padding: "0 var(--space-5)",
        color: "var(--ink-soft)",
        fontSize: "calc(15px * var(--scale))",
        fontWeight: 500,
        position: "relative", zIndex: 2,
      }}>Encuentra estas {words.length} palabras en la sopa</div>

      <div style={{
        margin: "var(--space-3) var(--space-4) var(--space-4)",
        display: "grid",
        gap: "var(--space-3)",
        position: "relative", zIndex: 2,
      }}>
        {words.map(w => <WordCard key={w.word} entry={w} found={found.has(w.word)}/>)}
      </div>

      <div style={{
        margin: "auto var(--space-4) var(--space-4)",
        position: "relative", zIndex: 2,
      }}>
        <button
          onClick={onGoToSopa}
          style={{
            width: "100%",
            background: "var(--accent-strong)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--r-md)",
            boxShadow: "0 5px 0 var(--ink)",
            color: "#fff",
            fontFamily: "Fredoka, sans-serif",
            fontWeight: 700,
            fontSize: "calc(20px * var(--scale))",
            padding: "var(--space-4) var(--space-5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "var(--space-3)",
            minHeight: "var(--tap)",
            cursor: "pointer",
            transition: "transform 120ms ease, box-shadow 120ms ease",
          }}
          onPointerDown={e => {
            e.currentTarget.style.transform = "translateY(4px)";
            e.currentTarget.style.boxShadow = "0 1px 0 var(--ink)";
          }}
          onPointerUp={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
          }}
          onPointerLeave={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
          }}
          onPointerCancel={e => {
            e.currentTarget.style.transform = "";
            e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
          }}
        >
          <span>Ir a la sopa</span>
          <span style={{ fontSize: "1.1em", lineHeight: 1 }}>↓</span>
        </button>
      </div>
    </>
  );
}

function WordCard({ entry, found }) {
  return (
    <div style={{
      background: found ? "var(--ok-soft)" : "var(--surface)",
      border: `3px solid ${found ? "var(--ok)" : "var(--ink)"}`,
      borderRadius: "var(--r-md)",
      boxShadow: `0 3px 0 ${found ? "var(--ok)" : "var(--ink)"}`,
      padding: "var(--space-3) var(--space-4)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
    }}>
      <div style={{
        flexShrink: 0,
        opacity: found ? 0.5 : 1,
        filter: found ? "grayscale(0.55)" : "none",
        transition: "opacity 240ms ease, filter 240ms ease",
      }}>
        <WordImage entry={entry} size={48}/>
      </div>
      <div style={{
        fontFamily: "Andika, Fredoka, sans-serif",
        fontWeight: 700,
        fontSize: "calc(22px * var(--scale))",
        letterSpacing: "0.01em",
        color: found ? "var(--ok)" : "var(--ink)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "0 0.1em",
        flex: 1,
        minWidth: 0,
      }}>
        {entry.syllables.map((s, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span aria-hidden style={{ color: "var(--ink-faint)", fontWeight: 500 }}>·</span>}
            <span>{s}</span>
          </React.Fragment>
        ))}
      </div>
      {found && (
        <div style={{
          flexShrink: 0,
          width: "calc(30px * var(--scale))",
          height: "calc(30px * var(--scale))",
          background: "var(--ok)",
          color: "#fff",
          borderRadius: "50%",
          display: "grid", placeItems: "center",
          fontWeight: 800,
          fontSize: "calc(16px * var(--scale))",
        }}>✓</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pantalla Sopa — header + tira de iconos + cuadrícula
// ─────────────────────────────────────────────────────────────
function WSSopaScreen({ words, board, found, onFound, onBack, onGoToPalabras }) {
  return (
    <>
      <ScreenHeader
        title="Animales"
        onBack={onBack}
        right={<ProgressChip current={found.size} total={words.length}/>}
      />
      <WSIconStrip words={words} found={found} onClick={onGoToPalabras}/>
      <WSLetterGrid board={board} found={found} onFound={onFound}/>
      <div style={{
        textAlign: "center",
        color: "var(--ink-soft)",
        fontWeight: 600,
        fontSize: "calc(13px * var(--scale))",
        padding: "var(--space-3) var(--space-4) var(--space-4)",
        position: "relative", zIndex: 2,
      }}>Arrastra o toca dos celdas (inicio y final)</div>
    </>
  );
}

function ProgressChip({ current, total }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "2px solid var(--ink)",
      borderRadius: 999,
      padding: "6px 12px",
      fontSize: "calc(14px * var(--scale))",
      fontWeight: 700,
      boxShadow: "0 2px 0 var(--ink)",
      whiteSpace: "nowrap",
      color: "var(--ink)",
    }}>
      <span style={{ color: "var(--ok)" }}>●</span> {current}/{total}
    </div>
  );
}

function WSIconStrip({ words, found, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Ver lista de palabras"
      style={{
        position: "relative",
        margin: "var(--space-2) auto var(--space-4)",
        maxWidth: "calc(100% - 28px)",
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-md)",
        boxShadow: "0 4px 0 var(--ink)",
        padding: "16px 12px 10px",
        display: "grid",
        gridTemplateColumns: `repeat(${words.length}, 56px)`,
        justifyContent: "center",
        gap: 10,
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        zIndex: 2,
      }}
    >
      {/* "Grip" superior — pista visual de que esto viene desde arriba */}
      <span aria-hidden style={{
        position: "absolute",
        top: 5, left: "50%", transform: "translateX(-50%)",
        width: 36, height: 4,
        borderRadius: 999,
        background: "var(--ink-faint)",
      }}/>
      {/* Pildorita "↑ Palabras" en esquina inferior */}
      <span aria-hidden style={{
        position: "absolute",
        right: 12, bottom: -10,
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        color: "var(--ink-soft)",
        fontSize: "calc(11px * var(--scale))",
        fontWeight: 700,
        letterSpacing: "0.06em",
        padding: "2px 8px",
        borderRadius: 999,
        boxShadow: "0 2px 0 var(--ink)",
      }}>↑ Palabras</span>

      {words.map(w => {
        const isFound = found.has(w.word);
        return (
          <div key={w.word} style={{
            aspectRatio: "1 / 1",
            borderRadius: "var(--r-sm)",
            background: isFound ? "var(--ok-soft)" : "transparent",
            display: "grid",
            placeItems: "center",
            transition: "background 200ms ease",
          }}>
            <div style={{
              opacity: isFound ? 0.4 : 1,
              filter: isFound ? "grayscale(0.7)" : "none",
              transition: "opacity 200ms ease, filter 200ms ease",
            }}>
              <WordImage entry={w} size={30}/>
            </div>
          </div>
        );
      })}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// WSLetterGrid — interacción (arrastre + dos taps)
// ─────────────────────────────────────────────────────────────
function WSLetterGrid({ board, found, onFound }) {
  const gridRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const [tapAnchor, setTapAnchor] = useState(null);
  const downPosRef = useRef(null);
  const nRows = board.grid.length;
  const nCols = board.grid[0].length;

  const foundCells = useMemo(() => {
    const s = new Set();
    for (const p of board.placements) {
      if (!found.has(p.word)) continue;
      for (let k = 0; k < p.len; k++) {
        const r = p.r0 + p.dir.dr * k;
        const c = p.c0 + p.dir.dc * k;
        s.add(`${r},${c}`);
      }
    }
    return s;
  }, [board, found]);

  const selCells = new Set();
  if (drag) {
    const path = _wsSnapPath(drag.start, drag.end, nRows, nCols);
    for (const { r, c } of path) selCells.add(`${r},${c}`);
  }

  const cellFromPoint = (clientX, clientY) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    const cellEl = el.closest('[data-rc]');
    if (!cellEl || !gridRef.current?.contains(cellEl)) return null;
    const [r, c] = cellEl.dataset.rc.split(',').map(Number);
    return { r, c };
  };

  const onPointerDown = (e) => {
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    e.preventDefault();
    try { gridRef.current?.setPointerCapture(e.pointerId); } catch (_) {}
    downPosRef.current = { x: e.clientX, y: e.clientY };
    setDrag({ start: cell, end: cell });
  };

  const onPointerMove = (e) => {
    if (!drag) return;
    const cell = cellFromPoint(e.clientX, e.clientY);
    if (!cell) return;
    if (cell.r === drag.end.r && cell.c === drag.end.c) return;
    setDrag(prev => prev ? { ...prev, end: cell } : prev);
  };

  const onPointerUp = (e) => {
    if (!drag) return;
    const cell = cellFromPoint(e.clientX, e.clientY) || drag.end;
    const down = downPosRef.current;
    const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0;
    const isTap = moved < 12 && drag.start.r === cell.r && drag.start.c === cell.c;

    if (isTap) {
      if (tapAnchor === null) {
        setTapAnchor(cell);
      } else if (tapAnchor.r === cell.r && tapAnchor.c === cell.c) {
        setTapAnchor(null);
      } else {
        const hit = _wsValidatePath(tapAnchor, cell, board, found);
        if (hit) onFound(hit.word);
        setTapAnchor(null);
      }
    } else {
      const hit = _wsValidatePath(drag.start, cell, board, found);
      if (hit) onFound(hit.word);
      if (tapAnchor) setTapAnchor(null);
    }
    setDrag(null);
  };

  const onPointerCancel = () => setDrag(null);

  return (
    <div style={{
      width: "100%",
      maxWidth: 380,
      margin: "var(--space-2) auto 0",
      padding: "0 var(--space-4)",
      containerType: "inline-size",
      position: "relative",
      zIndex: 2,
    }}>
      <div
        ref={gridRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${nCols}, 1fr)`,
          background: "var(--surface)",
          border: "3px solid var(--ink)",
          borderRadius: "var(--r-lg)",
          boxShadow: "0 4px 0 var(--ink)",
          padding: 8,
          gap: 4,
          touchAction: "none",
          position: "relative",
        }}
      >
        {board.grid.map((row, r) =>
          row.map((ch, c) => {
            const key = `${r},${c}`;
            const isFound = foundCells.has(key);
            const isSel = selCells.has(key);
            const isAnchor = !drag && tapAnchor && tapAnchor.r === r && tapAnchor.c === c;
            return (
              <Cell
                key={key}
                rc={key}
                ch={ch}
                isFound={isFound}
                isSel={isSel}
                isAnchor={isAnchor}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function Cell({ rc, ch, isFound, isSel, isAnchor }) {
  // Estado base + overrides explícitos en una sola pasada para evitar
  // que `border` (shorthand) y `borderColor` (longhand) en el mismo
  // style object dejen restos al re-renderizar.
  let bg = "var(--bg)";
  let color = "var(--ink)";
  let border = "1.5px solid var(--ink-faint)";
  let transform = "none";
  let boxShadow = "none";
  let animation = "none";
  let zIndex = 0;

  if (isFound) {
    bg = "var(--ok-soft)";
    color = "var(--ok)";
    border = "1.5px solid var(--ok)";
  }
  if (isSel || isAnchor) {
    transform = "scale(1.06)";
    boxShadow = "0 0 0 3px var(--accent-strong)";
    zIndex = 1;
    if (!isFound) {
      bg = "var(--accent)";
      color = "#fff";
      border = "1.5px solid var(--accent-strong)";
    }
    if (isAnchor) {
      animation = "ws-pulse 0.9s ease-in-out infinite";
    }
  }

  return (
    <div
      data-rc={rc}
      style={{
        aspectRatio: "1 / 1",
        background: bg,
        color,
        border,
        borderRadius: 8,
        display: "grid",
        placeItems: "center",
        fontFamily: "Andika, Fredoka, sans-serif",
        fontWeight: 700,
        userSelect: "none",
        fontSize: "clamp(16px, 7cqi, 26px)",
        transition: "transform 100ms ease",
        boxShadow,
        transform,
        animation,
        zIndex,
      }}
    >{ch}</div>
  );
}

// ─────────────────────────────────────────────────────────────
// Pantalla de fin de sesión
// ─────────────────────────────────────────────────────────────
function WordSearchSessionComplete({ words, onPlayAgain, onBack }) {
  const [confettiOn, setConfettiOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setConfettiOn(false), 2200);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>
      <Confetti active={confettiOn}/>

      <ScreenHeader title="¡Sesión completa!" onBack={onBack}/>

      <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "var(--space-5) var(--space-5) var(--space-4)",
        position: "relative", zIndex: 2,
      }}>
        <Trophy size={180}/>
        <div style={{
          marginTop: "var(--space-4)",
          fontSize: "calc(26px * var(--scale))",
          fontWeight: 700,
          fontFamily: "Fredoka, sans-serif",
          textAlign: "center",
        }}>¡Encontraste todas las palabras!</div>
      </div>

      <div style={{
        margin: "var(--space-4) var(--space-5) 0",
        padding: "var(--space-4)",
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-lg)",
        boxShadow: "var(--shadow-md)",
        position: "relative", zIndex: 2,
      }}>
        <div style={{
          color: "var(--ink-soft)",
          fontSize: "calc(12px * var(--scale))",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          marginBottom: "var(--space-3)",
        }}>Repaso</div>
        <div style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}>
          {words.map(w => <WordCard key={w.word} entry={w} found={true}/>)}
        </div>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        margin: "var(--space-5) var(--space-4) 0",
        position: "relative", zIndex: 2,
      }}>
        <BigButton color="accent" icon="🔁" onClick={onPlayAgain}>
          Jugar de nuevo
        </BigButton>
      </div>
    </div>
  );
}

window.WordSearch = WordSearch;

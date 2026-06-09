// "Sopa de letras" — encuentra palabras escondidas en una cuadrícula.
//
// Pantalla única: header + lista compacta de 4 palabras (rejilla 2×2)
// + cuadrícula 7×8. El niño ve siempre qué buscar y la sopa al mismo
// tiempo, sin alternar entre dos pantallas.
//
// Selección por arrastre Y por dos taps. Direcciones de colocación
// sólo → y ↓ (sin diagonales — demasiado difícil para primeros
// lectores y rompe la asociación natural izquierda-derecha que
// estamos enseñando). Aceptamos el arrastre inverso porque selecciona
// la misma palabra al revés.
//
// Pool: animales del diccionario, len ≤ 8, sólo A–Z (sin Ñ ni tildes).
//
// La lógica pura del generador vive en `lib/wordsearch-generator.js`
// (`window.SUPEINGO_WS`). Este componente sólo orquesta UI + estado.

const WS_CATEGORIES = ["animales"];
const WS_WORD_COUNT = 4;
const WS_POOL_SIZE = 12;
const WS_MAX_LEN = 8;
const WS_GRID = { rows: 8, cols: 7 };

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

// ─────────────────────────────────────────────────────────────
// WordSearch — componente raíz del juego
// ─────────────────────────────────────────────────────────────
function WordSearch({ onBack, debug = false, hideScary = false }) {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
  const candidates = useMemo(() => {
    const dict = (window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionary) || [];
    return window.SUPEINGO_WS.pickWords(dict, {
      seed,
      categories: WS_CATEGORIES,
      hideScary,
      minLen: 3,
      maxLen: WS_MAX_LEN,
      poolSize: WS_POOL_SIZE,
      requireImage: true,
      allowAccents: false,
    });
  }, [seed, hideScary]);
  const board = useMemo(
    () => window.SUPEINGO_WS.generateBoard({
      rows: WS_GRID.rows,
      cols: WS_GRID.cols,
      candidates,
      count: WS_WORD_COUNT,
      dirs: window.SUPEINGO_WS.DIRS.EASY,
      seed: seed + 1,
    }),
    [candidates, seed]
  );
  // `words` son las realmente colocadas en la sopa (board.words), no
  // las candidatas — así la lista visible nunca incluye una palabra
  // que el generador no consiguió encajar.
  const words = board.words;
  const [found, setFound] = useState(() => new Set());
  const [reveal, setReveal] = useState(null);
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
  };

  if (sessionDone) {
    return <WordSearchSessionComplete words={words} onPlayAgain={restart} onBack={onBack}/>;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-5)" }}>
      <div className="bg-decor"/>
      <Confetti active={confettiOn}/>

      <ScreenHeader
        title="Animales"
        onBack={onBack}
        right={<ProgressChip current={found.size} total={words.length}/>}
      />
      <WSWordList words={words} found={found}/>
      <WSLetterGrid board={board} found={found} onFound={handleFound}/>
      <div style={{
        textAlign: "center",
        color: "var(--ink-soft)",
        fontWeight: 600,
        fontSize: "calc(13px * var(--scale))",
        padding: "var(--space-3) var(--space-4) var(--space-4)",
        position: "relative", zIndex: 2,
      }}>Arrastra o toca dos celdas</div>

      {reveal && <MatchReveal entry={reveal}/>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// WSWordList — 4 palabras en rejilla 2×2 (compacta) sobre la sopa.
// ─────────────────────────────────────────────────────────────
// Versión compacta para mostrar todas las palabras junto a la
// cuadrícula sin robarle altura. Mismo lenguaje visual que WordCard
// (borde grueso, sombra de cartón, estados encontrado/pendiente).
function WSWordList({ words, found }) {
  return (
    <div style={{
      margin: "var(--space-2) var(--space-4) var(--space-3)",
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "var(--space-2)",
      position: "relative", zIndex: 2,
    }}>
      {words.map(w => (
        <WSCompactCard key={w.word} entry={w} found={found.has(w.word)}/>
      ))}
    </div>
  );
}

function WSCompactCard({ entry, found }) {
  const borderColor = found ? "var(--ok)" : "var(--ink)";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => speak(entry.word)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); speak(entry.word); } }}
      onPointerDown={e => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${borderColor}`; }}
      onPointerUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 0 ${borderColor}`; }}
      onPointerLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 0 ${borderColor}`; }}
      onPointerCancel={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 0 ${borderColor}`; }}
      style={{
        background: found ? "var(--ok-soft)" : "var(--surface)",
        border: `2.5px solid ${borderColor}`,
        borderRadius: "var(--r-sm)",
        boxShadow: `0 3px 0 ${borderColor}`,
        padding: "var(--space-2) var(--space-3)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        minHeight: "calc(56px * var(--scale))",
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}>
      <div style={{
        flexShrink: 0,
        opacity: found ? 0.5 : 1,
        filter: found ? "grayscale(0.55)" : "none",
        transition: "opacity 240ms ease, filter 240ms ease",
      }}>
        <WordImage entry={entry} size={32}/>
      </div>
      <div style={{
        fontFamily: "Andika, Fredoka, sans-serif",
        fontWeight: 700,
        fontSize: "calc(17px * var(--scale))",
        letterSpacing: "0.01em",
        color: found ? "var(--ok)" : "var(--ink)",
        display: "flex",
        flexWrap: "wrap",
        alignItems: "baseline",
        gap: "0 0.1em",
        flex: 1,
        minWidth: 0,
        lineHeight: 1.1,
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
          width: "calc(20px * var(--scale))",
          height: "calc(20px * var(--scale))",
          background: "var(--ok)",
          color: "#fff",
          borderRadius: "50%",
          display: "grid", placeItems: "center",
          fontWeight: 800,
          fontSize: "calc(11px * var(--scale))",
        }}>✓</div>
      )}
    </div>
  );
}

// `done` → muestra el tick (palabra completada).
// `highlight` → resalta la tarjeta en verde. Va por separado para que
// el repaso final (todas completadas) pueda mostrar el tick sin que
// la lista entera se tiña de verde.
function WordCard({ entry, done, highlight }) {
  const borderColor = highlight ? "var(--ok)" : "var(--ink)";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => speak(entry.word)}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); speak(entry.word); } }}
      onPointerDown={e => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = `0 1px 0 ${borderColor}`; }}
      onPointerUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 0 ${borderColor}`; }}
      onPointerLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 0 ${borderColor}`; }}
      onPointerCancel={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 3px 0 ${borderColor}`; }}
      style={{
        background: highlight ? "var(--ok-soft)" : "var(--surface)",
        border: `3px solid ${borderColor}`,
        borderRadius: "var(--r-md)",
        boxShadow: `0 3px 0 ${borderColor}`,
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        cursor: "pointer",
        userSelect: "none",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}>
      <div style={{
        flexShrink: 0,
        opacity: highlight ? 0.5 : 1,
        filter: highlight ? "grayscale(0.55)" : "none",
        transition: "opacity 240ms ease, filter 240ms ease",
      }}>
        <WordImage entry={entry} size={48}/>
      </div>
      <div style={{
        fontFamily: "Andika, Fredoka, sans-serif",
        fontWeight: 700,
        fontSize: "calc(22px * var(--scale))",
        letterSpacing: "0.01em",
        color: highlight ? "var(--ok)" : "var(--ink)",
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
      {done && (
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
// ProgressChip — "● 2/4" en el header
// ─────────────────────────────────────────────────────────────
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
    const path = window.SUPEINGO_WS.linePath(drag.start, drag.end);
    if (path) for (const { r, c } of path) selCells.add(`${r},${c}`);
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
    const upCell = cellFromPoint(e.clientX, e.clientY) || drag.end;
    const down = downPosRef.current;
    const moved = down ? Math.hypot(e.clientX - down.x, e.clientY - down.y) : 0;
    const isTap = moved < 12 && drag.start.r === upCell.r && drag.start.c === upCell.c;

    if (isTap) {
      // Tap mode estricto: las dos celdas deben estar exactamente
      // alineadas con los extremos de una palabra (misma fila, columna
      // o diagonal perfecta, y misma longitud).
      if (tapAnchor === null) {
        setTapAnchor(upCell);
      } else if (tapAnchor.r === upCell.r && tapAnchor.c === upCell.c) {
        setTapAnchor(null);
      } else {
        const hit = window.SUPEINGO_WS.validatePath(tapAnchor, upCell, board, found);
        if (hit) onFound(hit.word);
        setTapAnchor(null);
      }
    } else {
      const hit = window.SUPEINGO_WS.validatePath(drag.start, upCell, board, found);
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
    boxShadow = "0 0 0 3px var(--primary-strong)";
    zIndex = 1;
    if (!isFound) {
      bg = "var(--primary)";
      color = "#fff";
      border = "1.5px solid var(--primary-strong)";
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
        <div style={{
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
          {words.map(w => <WordCard key={w.word} entry={w} done={true} highlight={false}/>)}
        </div>
      </div>

      <div style={{
        display: "flex",
        justifyContent: "center",
        margin: "var(--space-5) var(--space-4) 0",
        position: "relative", zIndex: 2,
      }}>
        <ActionButton variant="primary" icon="reload" onClick={onPlayAgain}>
          Jugar de nuevo
        </ActionButton>
      </div>
    </div>
  );
}

window.WordSearch = WordSearch;

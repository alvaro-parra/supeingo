// "Busca letras" — el niño ve la palabra-ejemplo de una letra con un
// hueco donde va la letra objetivo (no siempre la primera: para Ñ →
// PIÑA el hueco va en medio; para X → TAXI también). Debe pulsar la
// letra que falta en un abecedario al pie. Una sola oportunidad por
// palabra; 5 palabras por ronda. Audio "a, de avión" en aciertos y
// en fallos (al fallar se ve la letra correcta resaltada y se oye la
// frase completa antes de avanzar).
//
// Pool: las MISMAS palabras-ejemplo del abecedario (data/alphabet.js).
// Una entrada por letra → cada letra está igualmente representada y
// el niño ve las mismas palabras con las que aprende en Aprender →
// Letras.
//
// Respeta:
//   - includeDigraphs (Settings): si false, no aparecen CH/LL ni en el
//     grid ni en el pool.
//   - hideScary (Settings): vía isScaryEntry sobre la palabra-ejemplo.

const LH_SESSION_SIZE = 5;

function _lhShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Quita tildes y pasa a mayúsculas; conserva Ñ (no es diacrítico).
function _lhNorm(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();
}

// Localiza la primera ocurrencia de `letter.upper` dentro de `word`
// usando comparación normalizada (tildes ignoradas). Devuelve el índice
// inicial dentro de la palabra ORIGINAL, o -1 si no se encuentra. La
// longitud del match es siempre letter.upper.length (1 normalmente, 2
// para los dígrafos CH/LL).
function _lhFindLetterPos(word, letter) {
  const W = _lhNorm(word);
  const L = _lhNorm(letter.upper);
  const len = letter.upper.length;
  for (let i = 0; i <= W.length - len; i++) {
    if (W.slice(i, i + len) === L) return i;
  }
  return -1;
}

function LetterHunt({ onBack, debug = false }) {
  // Abecedario filtrado por preferencia de dígrafos.
  const alphabet = useMemo(() => {
    const all = window.SUPEINGO_CONTENT.alphabet;
    const teaching = window.SUPEINGO_TEACHING_CONFIG || {};
    return teaching.includeDigraphs === false
      ? all.filter(l => !l.digraph)
      : all;
  }, []);

  // Pool: una entrada por letra del abecedario activo. Cada entrada del
  // abecedario viene hidratada con emoji/image/syllables del diccionario
  // (data/alphabet.js). Excluimos las palabras "miedo" (vía
  // isScaryEntry sobre el string `word`) y las que no tienen
  // representación gráfica.
  const pool = useMemo(() => {
    return alphabet.filter(l => {
      if (isScaryEntry(l.word)) return false;
      if (!l.emoji && !l.image) return false;
      // Defensivo: si la letra no aparece en su palabra-ejemplo (no
      // debería pasar con los datos actuales), excluimos para no
      // mostrar un hueco vacío.
      return _lhFindLetterPos(l.word, l) >= 0;
    });
  }, [alphabet]);

  const [sessionSeed, setSessionSeed] = useState(0);
  // Una sesión = 5 letras al azar del pool. Cada `letter` del pool ya
  // es única, así que no se repite letra dentro de la ronda.
  // Mantenemos `entry` y `letter` separados aunque hoy sean el mismo
  // objeto, por simetría con cómo se consume aguas abajo.
  const session = useMemo(
    () => _lhShuffle(pool).slice(0, LH_SESSION_SIZE).map(l => ({ entry: l, letter: l })),
    // eslint-disable-next-line
    [sessionSeed, pool]
  );

  const [idx, setIdx] = useState(0);
  const sessionDone = idx >= session.length;
  const current = session[idx];

  // Estado de la pregunta actual.
  //   idle    → esperando pulsación
  //   correct → ha acertado, mostrando feedback
  //   wrong   → ha fallado, mostrando la letra correcta resaltada
  const [status, setStatus] = useState("idle");
  const [pickedUpper, setPickedUpper] = useState(null);
  const [confettiOn, setConfettiOn] = useState(false);
  // Registro de la ronda: array de { word, letter, correct } para el resumen.
  const [results, setResults] = useState([]);

  // Frase de la pregunta — misma que en Aprender → Letras: "t, de tomate".
  // Le dice al niño la letra y la palabra; el reto es identificar VISUALMENTE
  // esa letra en el abecedario de abajo. Se reproduce al entrar y se puede
  // repetir pulsando la card de la palabra.
  const promptPhrase = current
    ? `${current.letter.spell || current.letter.upper}, de ${current.entry.word}`
    : "";

  // Al cambiar de palabra, suena la frase de la pregunta.
  useEffect(() => {
    if (!current) return;
    let cancelled = false;
    (async () => {
      if (typeof whenTTSReady === "function") await whenTTSReady();
      if (cancelled) return;
      setTimeout(() => { if (!cancelled) speak(promptPhrase); }, 200);
    })();
    return () => { cancelled = true; };
  }, [current && current.entry.word]);

  const replayPrompt = () => {
    if (!current || status !== "idle") return;
    speak(promptPhrase);
  };

  const handlePick = (letterEntry) => {
    if (status !== "idle" || !current) return;
    const correct = letterEntry.upper === current.letter.upper;
    setPickedUpper(letterEntry.upper);

    if (correct) {
      // Acierto: jingle corto y pasamos a la siguiente. Sin repetir la
      // frase "letra, de palabra" — ya la ha oído al principio.
      playFeedback("correct");
      setStatus("correct");
      setConfettiOn(true);
      setResults(r => [...r, { ...current, correct: true }]);
      setTimeout(() => {
        setConfettiOn(false);
        setPickedUpper(null);
        setStatus("idle");
        setIdx(i => i + 1);
      }, 900);
    } else {
      // Fallo: jingle de error + repetimos la frase para que la asocie
      // antes de avanzar. Mismo patrón que en Letras: "a, de avión".
      playFeedback("wrong");
      setStatus("wrong");
      setTimeout(() => speak(promptPhrase), 250);
      setResults(r => [...r, { ...current, correct: false }]);
      setTimeout(() => {
        setPickedUpper(null);
        setStatus("idle");
        setIdx(i => i + 1);
      }, 2200);
    }
  };

  const restartSession = () => {
    setResults([]);
    setIdx(0);
    setPickedUpper(null);
    setStatus("idle");
    setSessionSeed(s => s + 1);
  };

  if (sessionDone) {
    return <LetterHuntSessionComplete
      results={results}
      onPlayAgain={restartSession}
      onBack={onBack}
    />;
  }

  if (!current) {
    // Pool vacío (no debería pasar; protege contra config rara).
    return (
      <div style={{ padding: "var(--space-5)" }}>
        <ScreenHeader title="Busca letras" onBack={onBack}/>
        <p>No hay palabras disponibles con la configuración actual.</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>
      <ScreenHeader
        title="Busca letras"
        onBack={onBack}
        right={<LHProgressChip current={idx + 1} total={session.length}/>}
      />

      {/* Card central: dibujo grande + palabra con la letra objetivo
          oculta. Pulsar la card vuelve a reproducir el audio. */}
      <WordWithGap
        entry={current.entry}
        letter={current.letter}
        status={status}
        onReplay={replayPrompt}
      />

      {/* Abecedario al pie: el niño pulsa la letra que falta. */}
      <AlphabetGrid
        alphabet={alphabet}
        correctUpper={current.letter.upper}
        pickedUpper={pickedUpper}
        status={status}
        onPick={handlePick}
      />

      <Confetti active={confettiOn}/>

      {debug && (
        <div style={{
          position: "fixed", left: 8, bottom: 8,
          background: "rgba(20,20,24,0.9)", color: "#fff",
          padding: "6px 10px", borderRadius: 8,
          fontSize: 11, fontFamily: "ui-monospace, monospace",
          zIndex: 100, pointerEvents: "none",
        }}>
          {current.entry.word} → {current.letter.upper}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Card con el dibujo y la palabra con un hueco donde va la letra
// objetivo. La letra puede estar al principio (AVIÓN → "_VIÓN") o
// en mitad (PIÑA → "PI_A", TAXI → "TA_I"). Para dígrafos CH/LL el
// hueco ocupa los dos caracteres juntos.
// ──────────────────────────────────────────────────────────────
function WordWithGap({ entry, letter, status, onReplay }) {
  // El hueco se rellena con la letra correcta cuando hay feedback (sea
  // acierto o fallo). Así el niño SIEMPRE ve la palabra completa al
  // resolverse la pregunta — refuerza visualmente lo que va a oír.
  const reveal = status !== "idle";
  const pos = _lhFindLetterPos(entry.word, letter);
  const len = letter.upper.length;
  const head = entry.word.slice(0, pos);
  // Lo que va dentro del hueco al revelarse: la letra REAL de la palabra
  // (puede llevar tilde — "Á" en ÁRBOL — aunque la letra del abecedario
  // sea "A"). Así el niño ve la ortografía exacta.
  const middle = entry.word.slice(pos, pos + len);
  const tail = entry.word.slice(pos + len);

  // Color del hueco según estado: verde en acierto, rojo en fallo,
  // gris discreto mientras se espera.
  const gapBg = status === "correct" ? "var(--ok-soft)"
    : status === "wrong" ? "#FDE2E4"
    : "var(--bg-2)";
  const gapBorder = status === "correct" ? "var(--ok)"
    : status === "wrong" ? "var(--accent-strong)"
    : "var(--ink-faint)";

  const idle = status === "idle";
  return (
    <div
      role="button"
      tabIndex={idle ? 0 : -1}
      aria-label={`Escuchar pista de ${entry.word}`}
      onClick={() => idle && onReplay && onReplay()}
      onKeyDown={e => {
        if (!idle) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onReplay && onReplay();
        }
      }}
      style={{
        margin: "var(--space-3) var(--space-4) var(--space-4)",
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-4)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-3)",
        position: "relative", zIndex: 2,
        cursor: idle ? "pointer" : "default",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onPointerDown={e => {
        if (!idle) return;
        e.currentTarget.style.transform = "translateY(2px)";
        e.currentTarget.style.boxShadow = "0 2px 0 rgba(42,42,51,0.12)";
      }}
      onPointerUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onPointerLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onPointerCancel={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
    >
      <WordImage entry={entry} size={96}/>
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        fontFamily: "Andika, Fredoka, sans-serif",
        fontWeight: 700,
        fontSize: "calc(34px * var(--scale))",
        letterSpacing: "0.04em",
        color: "var(--ink)",
      }}>
        {head && <span>{head}</span>}
        <span style={{
          minWidth: `calc(${28 * len + 14}px * var(--scale))`,
          minHeight: "calc(48px * var(--scale))",
          padding: "0 4px",
          background: gapBg,
          border: `3px dashed ${gapBorder}`,
          borderRadius: "var(--r-sm)",
          display: "inline-grid",
          placeItems: "center",
          color: reveal ? "var(--accent-strong)" : "var(--ink-faint)",
          transition: "background 200ms ease, border-color 200ms ease, color 200ms ease",
        }}>{reveal ? middle : "·"}
        </span>
        {tail && <span>{tail}</span>}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Grid del abecedario — cada letra es un botón. Marca la letra
// correcta (en estado wrong o correct) y la pulsada (si fue mal).
// ──────────────────────────────────────────────────────────────
function AlphabetGrid({ alphabet, correctUpper, pickedUpper, status, onPick }) {
  return (
    <div style={{
      margin: "0 var(--space-4)",
      padding: "var(--space-3)",
      background: "var(--bg-2)",
      border: "3px dashed var(--ink-faint)",
      borderRadius: "var(--r-lg)",
      position: "relative", zIndex: 2,
    }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "var(--space-2)",
      }}>
        {alphabet.map(l => {
          const isCorrect = l.upper === correctUpper;
          const isPicked = l.upper === pickedUpper;
          const reveal = status !== "idle";

          // Color de fondo:
          //  - acierto: la pulsada (= correcta) en verde.
          //  - fallo:   la pulsada en rojo, y la correcta resaltada en verde.
          //  - idle:    color rotativo suave (mismo patrón que LearnArea).
          let bg, border;
          if (reveal && isCorrect) {
            bg = "var(--ok-soft)"; border = "var(--ok)";
          } else if (reveal && isPicked && !isCorrect) {
            bg = "var(--accent)"; border = "var(--accent-strong)";
          } else {
            bg = "var(--surface)"; border = "var(--ink)";
          }

          const disabled = status !== "idle";

          return (
            <button
              key={l.upper}
              onClick={() => onPick(l)}
              disabled={disabled}
              aria-label={`Letra ${l.upper}`}
              style={{
                aspectRatio: "1 / 1",
                background: bg,
                border: `3px solid ${border}`,
                borderRadius: "var(--r-md)",
                boxShadow: (reveal && (isCorrect || isPicked)) ? "0 1px 0 var(--ink)" : "0 3px 0 var(--ink)",
                transform: (reveal && (isCorrect || isPicked)) ? "translateY(2px)" : "none",
                fontFamily: "Andika, Fredoka, sans-serif",
                fontWeight: 700,
                fontSize: "calc(20px * var(--scale))",
                color: "var(--ink)",
                cursor: disabled ? "default" : "pointer",
                animation: (reveal && isPicked && !isCorrect) ? "shake 360ms ease-in-out" : "none",
                transition: "transform 120ms ease, box-shadow 120ms ease, background 200ms ease, border-color 200ms ease",
              }}
              onPointerDown={e => {
                if (disabled) return;
                e.currentTarget.style.transform = "translateY(2px)";
                e.currentTarget.style.boxShadow = "0 1px 0 var(--ink)";
              }}
              onPointerUp={e => {
                if (disabled) return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 3px 0 var(--ink)";
              }}
              onPointerLeave={e => {
                if (disabled) return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 3px 0 var(--ink)";
              }}
              onPointerCancel={e => {
                if (disabled) return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 3px 0 var(--ink)";
              }}
            >
              {l.upper}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Pantalla de fin de sesión — trofeo + repaso con ✓/✗ + acciones.
// ──────────────────────────────────────────────────────────────
function LetterHuntSessionComplete({ results, onPlayAgain, onBack }) {
  const [confettiOn, setConfettiOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setConfettiOn(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const correct = results.filter(r => r.correct).length;

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
          fontSize: "calc(28px * var(--scale))",
          fontWeight: 700,
          fontFamily: "Fredoka, sans-serif",
          textAlign: "center",
        }}>¡{correct} de {results.length}!</div>
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
          gap: "var(--space-2)",
        }}>
          {results.map((r, i) => {
            // Resaltar la letra en su posición real (puede no ser la primera).
            const pos = _lhFindLetterPos(r.entry.word, r.letter);
            const len = r.letter.upper.length;
            const head = pos > 0 ? r.entry.word.slice(0, pos) : "";
            const middle = pos >= 0 ? r.entry.word.slice(pos, pos + len) : "";
            const tail = pos >= 0 ? r.entry.word.slice(pos + len) : r.entry.word;
            const phrase = `${r.letter.spell || r.letter.upper}, de ${r.entry.word}`;
            return (
              <button
                key={`${r.entry.word}-${i}`}
                onClick={() => speak(phrase)}
                aria-label={`Escuchar ${r.entry.word}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-3)",
                  padding: "var(--space-2) var(--space-3)",
                  background: r.correct ? "var(--ok-soft)" : "var(--bg-2)",
                  border: `2px solid ${r.correct ? "var(--ok)" : "var(--ink-faint)"}`,
                  borderRadius: "var(--r-sm)",
                  cursor: "pointer",
                  textAlign: "left",
                  width: "100%",
                  transition: "transform 120ms ease, box-shadow 120ms ease",
                }}
                onPointerDown={e => { e.currentTarget.style.transform = "translateY(1px)"; }}
                onPointerUp={e => { e.currentTarget.style.transform = ""; }}
                onPointerLeave={e => { e.currentTarget.style.transform = ""; }}
                onPointerCancel={e => { e.currentTarget.style.transform = ""; }}
              >
                <WordImage entry={r.entry} size={32} scale={false}/>
                <div style={{
                  fontFamily: "Andika, Fredoka, sans-serif",
                  fontWeight: 700,
                  fontSize: "calc(18px * var(--scale))",
                  letterSpacing: "0.04em",
                  flex: 1,
                }}>
                  {head && <span>{head}</span>}
                  <span style={{ color: "var(--accent-strong)" }}>{middle}</span>
                  {tail && <span>{tail}</span>}
                </div>
                <span aria-hidden style={{
                  fontSize: 20,
                  color: r.correct ? "var(--ok)" : "var(--ink-faint)",
                  fontWeight: 700,
                }}>
                  {r.correct ? "✓" : "·"}
                </span>
              </button>
            );
          })}
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

// Chip de progreso del header — mismo estilo que el de Sopa de letras.
function LHProgressChip({ current, total }) {
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

window.LetterHunt = LetterHunt;

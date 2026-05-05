// Constructor de palabras — la mecánica más simple
// Niño ve imagen + escucha palabra → arrastra/clica sílabas en orden
//
// Sesión: 10 palabras barajadas. Tras cada acierto, auto-avance (~1.4s)
// con la palabra "volando" hacia la lista inferior de logros. Al completar
// las 10, pantalla de trofeo con opción de volver a jugar o salir al menú.

const SESSION_SIZE = 10;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildSession(allWords) {
  // Si hay menos palabras que SESSION_SIZE, repetimos hasta llenar.
  const shuffled = shuffle(allWords);
  if (shuffled.length >= SESSION_SIZE) return shuffled.slice(0, SESSION_SIZE);
  const out = [];
  while (out.length < SESSION_SIZE) {
    out.push(...shuffle(allWords));
  }
  return out.slice(0, SESSION_SIZE);
}

function WordBuilder({ onBack, exampleWord }) {
  const allWords = window.SUPEINGO_CONTENT.words;

  // Construimos una sesión de 10 palabras al montar
  const [sessionSeed, setSessionSeed] = useState(0);
  const session = useMemo(() => {
    // Si vienen con `exampleWord`, la ponemos primera
    const built = buildSession(allWords);
    if (exampleWord) {
      const idx = built.findIndex(w => w.word === exampleWord);
      if (idx > 0) {
        const [w] = built.splice(idx, 1);
        built.unshift(w);
      } else if (idx === -1) {
        const ex = allWords.find(w => w.word === exampleWord);
        if (ex) built.unshift(ex);
      }
    }
    return built.slice(0, SESSION_SIZE);
    // eslint-disable-next-line
  }, [sessionSeed]);

  const [idx, setIdx] = useState(0);
  const sessionDone = idx >= session.length;
  // Si idx se sale del rango, usamos un placeholder para que los hooks
  // siguientes (useMemo, useEffect) no revienten al desreferenciar
  // target.word / target.syllables. La pantalla real de fin de sesión
  // se renderiza más abajo con un early-return ANTES del JSX principal.
  const target = session[idx] || { word: "", syllables: [], emoji: "" };

  // Histórico de aciertos en esta sesión: [{ word, syllables, emoji, attempts }]
  const [completed, setCompleted] = useState([]);
  const [attempts, setAttempts] = useState(1); // intentos para la palabra actual

  // Sílabas distractoras: tomamos la palabra correcta + 2 sílabas extras
  const pool = useMemo(() => {
    const correct = target.syllables;
    const others = allWords
      .filter(w => w.word !== target.word)
      .flatMap(w => w.syllables)
      .filter(s => !correct.includes(s));
    const distract = [];
    while (distract.length < 2 && others.length > 0) {
      const pick = others.splice(Math.floor(Math.random() * others.length), 1)[0];
      if (!distract.includes(pick)) distract.push(pick);
    }
    const all = [...correct, ...distract];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.map((s, i) => ({ id: `${i}-${s}`, syllable: s }));
    // eslint-disable-next-line
  }, [target.word, idx]);

  const [placed, setPlaced] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | correct | wrong | flying
  const [confettiOn, setConfettiOn] = useState(false);
  const [flyingWord, setFlyingWord] = useState(null); // { word, emoji, syllables } durante la animación

  // Speak target on load — esperamos a que el motor TTS esté caliente
  // antes del primer disparo, si no la primera palabra de la sesión sale
  // entrecortada. NO disparar si la sesión ya está completada (target
  // es el placeholder vacío en ese caso).
  useEffect(() => {
    if (!target.word) return;
    let cancelled = false;
    const run = async () => {
      if (typeof whenTTSReady === "function") {
        await whenTTSReady();
      }
      if (cancelled) return;
      // Pequeño respiro tras la utterance de warm-up para que el motor
      // libere su buffer antes de la real.
      setTimeout(() => { if (!cancelled) speak(target.word); }, 150);
    };
    run();
    return () => { cancelled = true; };
  }, [target.word]);

  const placedSyllables = placed.map(id => pool.find(p => p.id === id)?.syllable);
  const isComplete = placed.length === target.syllables.length;

  const handlePick = (id) => {
    if (status !== "idle") return;
    if (placed.includes(id)) {
      setPlaced(placed.filter(x => x !== id));
    } else if (placed.length < target.syllables.length) {
      setPlaced([...placed, id]);
    }
  };

  const handleSlotClick = (slotIdx) => {
    if (status !== "idle") return;
    if (placed[slotIdx] !== undefined) {
      setPlaced(placed.filter((_, i) => i !== slotIdx));
    }
  };

  const handleCheck = () => {
    if (status !== "idle" || !isComplete) return;
    const ok = placedSyllables.join("") === target.syllables.join("");
    if (ok) {
      setStatus("correct");
      setConfettiOn(true);
      setTimeout(() => speak(target.word), 250);

      // Tras la celebración, registramos y avanzamos
      const wordRecord = {
        word: target.word,
        syllables: target.syllables,
        emoji: target.emoji,
        attempts,
      };

      // 950ms: arranca la animación de "volar a la lista"
      setTimeout(() => {
        setFlyingWord(wordRecord);
        setStatus("flying");
      }, 950);

      // 1500ms: la palabra ya está en la lista, avanzamos
      setTimeout(() => {
        setCompleted(c => [...c, wordRecord]);
        setFlyingWord(null);
        setConfettiOn(false);
        setIdx(i => i + 1);
        setPlaced([]);
        setAttempts(1);
        setStatus("idle");
      }, 1500);
    } else {
      setStatus("wrong");
      setAttempts(a => a + 1);
      setTimeout(() => {
        setPlaced([]);
        setStatus("idle");
      }, 1000);
    }
  };

  const handleClear = () => {
    if (status !== "idle") return;
    setPlaced([]);
  };

  const restartSession = () => {
    setCompleted([]);
    setIdx(0);
    setPlaced([]);
    setAttempts(1);
    setStatus("idle");
    setSessionSeed(s => s + 1);
  };

  // ── Pantalla de fin de sesión ─────────────────────────────
  if (sessionDone) {
    return (
      <SessionComplete
        completed={completed}
        onPlayAgain={restartSession}
        onBack={onBack}
      />
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>

      <ScreenHeader
        title="Forma la palabra"
        onBack={onBack}
        right={
          <SessionProgress current={idx} total={session.length}/>
        }
      />

      {/* Pista contextual con la mascota */}
      <div style={{
        margin: "var(--space-3) var(--space-4) 0",
        position: "relative", zIndex: 2,
      }}>
        <MascotHint
          size={56}
          mood={status === "correct" ? "cheer" : status === "wrong" ? "sad" : "happy"}
        >
          {status === "correct" ? "¡Lo conseguiste!"
            : status === "wrong" ? "Casi, prueba otra vez"
            : "Pulsa las sílabas en orden para formar la palabra"}
        </MascotHint>
      </div>

      {/* Imagen + altavoz */}
      <div style={{
        margin: "var(--space-3) var(--space-5) var(--space-5)",
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-xl)",
        boxShadow: "var(--shadow-md)",
        padding: "var(--space-5)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "var(--space-3)",
        position: "relative",
        zIndex: 2,
      }}>
        <div
          id="wb-emoji"
          style={{
            fontSize: "calc(96px * var(--scale))",
            lineHeight: 1,
            animation: status === "correct" ? "pop 600ms ease-out" : "bob 2.4s ease-in-out infinite",
            filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.08))",
            opacity: status === "flying" ? 0 : 1,
            transition: "opacity 200ms ease",
          }}
          aria-hidden
        >{target.emoji}</div>
        <SpeakButton text={target.word} size={56}/>
      </div>

      {/* Slots */}
      <div style={{
        display: "flex",
        justifyContent: "center",
        gap: "var(--space-2)",
        flexWrap: "wrap",
        padding: "0 var(--space-4)",
        position: "relative",
        zIndex: 2,
        animation: status === "wrong" ? "shake 360ms ease-in-out" : "none",
      }}>
        {target.syllables.map((s, i) => (
          <Slot
            key={i}
            value={placed[i] !== undefined ? pool.find(p => p.id === placed[i])?.syllable : null}
            onClick={() => handleSlotClick(i)}
            status={status}
            isCorrect={status === "correct" || status === "flying"}
            slotWidth={Math.max(60, 380 / target.syllables.length)}
          />
        ))}
      </div>

      {/* Pista de progreso debajo de los slots */}
      <div style={{
        textAlign: "center",
        marginTop: "var(--space-3)",
        color: "var(--ink-soft)",
        fontSize: "calc(13px * var(--scale))",
        fontWeight: 600,
        minHeight: 20,
      }}>
        {status === "correct" || status === "flying"
          ? "¡Muy bien! 🎉"
          : status === "wrong"
            ? "Casi, prueba otra vez"
            : ""}
      </div>

      {/* Banco de sílabas */}
      <div style={{
        margin: "var(--space-5) var(--space-4) 0",
        padding: "var(--space-4)",
        background: "var(--bg-2)",
        border: "3px dashed var(--ink-faint)",
        borderRadius: "var(--r-lg)",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "var(--space-3)",
        position: "relative",
        zIndex: 2,
        minHeight: 100,
      }}>
        {pool.map(p => (
          <SyllableTile
            key={p.id}
            syllable={p.syllable}
            placed={placed.includes(p.id)}
            onClick={() => handlePick(p.id)}
            disabled={status !== "idle"}
          />
        ))}
      </div>

      {/* Botones de acción */}
      <div style={{
        margin: "var(--space-4) var(--space-4) 0",
        display: "flex",
        gap: "var(--space-3)",
        justifyContent: "center",
        position: "relative", zIndex: 2,
      }}>
        <ActionButton
          variant="ghost"
          onClick={handleClear}
          disabled={placed.length === 0 || status !== "idle"}
        >
          Borrar
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={handleCheck}
          disabled={!isComplete || status !== "idle"}
        >
          Comprobar
        </ActionButton>
      </div>

      <Confetti active={confettiOn}/>

      {/* Lista inferior de palabras conseguidas */}
      {completed.length > 0 && (
        <CompletedList items={completed}/>
      )}

      {/* Animación de "vuelo" — la palabra acertada baja hacia la lista */}
      {flyingWord && (
        <FlyingChip word={flyingWord}/>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Indicador "3 / 10" en el header
// ──────────────────────────────────────────────────────────────
function SessionProgress({ current, total }) {
  return (
    <div style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      padding: "6px 12px",
      background: "var(--surface)",
      border: "2px solid var(--ink)",
      borderRadius: 999,
      fontSize: "calc(13px * var(--scale))",
      fontWeight: 700,
      fontFamily: "Fredoka, sans-serif",
      boxShadow: "0 2px 0 var(--ink)",
      whiteSpace: "nowrap",
      flexShrink: 0,
    }}>
      <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden style={{ flexShrink: 0 }}>
        <path d="M 3 8 L 6.5 11 L 13 4.5"
          stroke="var(--ok)" strokeWidth="2.5" fill="none"
          strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ whiteSpace: "nowrap" }}>
        {current}
        <span style={{ color: "var(--ink-faint)", fontWeight: 500 }}>{" / "}{total}</span>
      </span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Lista inferior de palabras acertadas — chips con sílabas y intentos
// ──────────────────────────────────────────────────────────────
function CompletedList({ items }) {
  return (
    <div
      id="wb-completed-list"
      style={{
        margin: "var(--space-5) 0 0",
        padding: "var(--space-3) 0 var(--space-3)",
        position: "relative",
        zIndex: 2,
        animation: "slide-up 350ms ease-out",
      }}>
      <div style={{
        padding: "0 var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: 8,
        marginBottom: "var(--space-2)",
        color: "var(--ink-soft)",
        fontSize: "calc(12px * var(--scale))",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        <span aria-hidden>🌱</span>
        <span>Tu colección</span>
        <span style={{
          marginLeft: "auto",
          color: "var(--ink-faint)",
          fontWeight: 600,
          textTransform: "none",
          letterSpacing: 0,
        }}>{items.length}</span>
      </div>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-2)",
          padding: "var(--space-2) var(--space-5)",
          // alineación a la izquierda para que las filas se rellenen de
          // izquierda a derecha como un texto.
          justifyContent: "flex-start",
        }}>
        {items.map((it, i) => (
          <CompletedChip key={`${it.word}-${i}`} item={it} isLatest={i === items.length - 1}/>
        ))}
      </div>
    </div>
  );
}

function CompletedChip({ item, isLatest }) {
  const { word, syllables, emoji, attempts } = item;
  const perfect = attempts === 1;
  return (
    <button
      onClick={() => speak(word)}
      aria-label={`Escuchar ${word}`}
      style={{
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-md)",
        boxShadow: "0 3px 0 var(--ink)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: "pointer",
        animation: isLatest ? "chip-in 450ms cubic-bezier(0.34, 1.56, 0.64, 1)" : "none",
        transition: "transform 120ms ease",
      }}
      onPointerDown={e => e.currentTarget.style.transform = "translateY(2px)"}
      onPointerUp={e => e.currentTarget.style.transform = "translateY(0)"}
      onPointerLeave={e => e.currentTarget.style.transform = "translateY(0)"}
    >
      <span style={{ fontSize: 28, lineHeight: 1 }} aria-hidden>{emoji}</span>
      <span style={{
        fontFamily: "Andika, Fredoka, sans-serif",
        fontWeight: 700,
        fontSize: "calc(15px * var(--scale))",
        letterSpacing: "0.03em",
        display: "inline-flex",
        alignItems: "baseline",
        gap: "0.15em",
      }}>
        {syllables.map((s, i) => (
          <React.Fragment key={i}>
            <span>{s}</span>
            {i < syllables.length - 1 && (
              <span aria-hidden style={{
                color: "var(--ink-faint)",
                fontWeight: 500,
              }}>·</span>
            )}
          </React.Fragment>
        ))}
      </span>
      <AttemptsBadge attempts={attempts} perfect={perfect}/>
    </button>
  );
}

function AttemptsBadge({ attempts, perfect }) {
  if (perfect) {
    // Un único punto verde con check pequeño = "a la primera"
    return (
      <span
        title="¡A la primera!"
        style={{
          width: 22, height: 22,
          borderRadius: "50%",
          background: "var(--ok)",
          border: "2px solid var(--ink)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}>
        <svg viewBox="0 0 12 12" width={12} height={12} aria-hidden>
          <path d="M 2.5 6.2 L 5 8.5 L 9.5 4"
            stroke="var(--ink)" strokeWidth="2" fill="none"
            strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
    );
  }
  return (
    <span
      title={`${attempts} intentos`}
      style={{
        minWidth: 22, height: 22,
        padding: "0 6px",
        borderRadius: 999,
        background: "var(--bg-2)",
        border: "2px solid var(--ink-soft)",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
        fontSize: 11,
        fontWeight: 700,
        color: "var(--ink-soft)",
        fontFamily: "Fredoka, sans-serif",
      }}>
      {attempts}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// FlyingChip — animación overlay de la palabra "volando" desde
// la zona de slots hasta la lista inferior. Usa posición fija
// y CSS keyframes; es un guiño visual de ~500ms.
// ──────────────────────────────────────────────────────────────
function FlyingChip({ word }) {
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        left: "50%",
        top: "38%",
        transform: "translate(-50%, -50%)",
        zIndex: 80,
        pointerEvents: "none",
        animation: "fly-to-list 550ms cubic-bezier(0.5, 0, 0.6, 1) forwards",
      }}>
      <div style={{
        background: "var(--ok-soft)",
        border: "3px solid var(--ok)",
        borderRadius: "var(--r-md)",
        boxShadow: "0 4px 0 var(--ok)",
        padding: "12px 18px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <span style={{ fontSize: 32 }}>{word.emoji}</span>
        <span style={{
          fontFamily: "Andika, Fredoka, sans-serif",
          fontWeight: 700,
          fontSize: "calc(20px * var(--scale))",
          letterSpacing: "0.04em",
        }}>
          {word.syllables.map((s, i) => (
            <React.Fragment key={i}>
              <span>{s}</span>
              {i < word.syllables.length - 1 && (
                <span style={{ color: "var(--ink-faint)", fontWeight: 500 }}>·</span>
              )}
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Pantalla fin de sesión — trofeo + repaso + acciones
// ──────────────────────────────────────────────────────────────
function SessionComplete({ completed, onPlayAgain, onBack }) {
  const [confettiOn, setConfettiOn] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setConfettiOn(false), 2200);
    return () => clearTimeout(t);
  }, []);

  const perfect = completed.filter(c => c.attempts === 1).length;

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>
      <Confetti active={confettiOn}/>

      <ScreenHeader title="¡Sesión completa!" onBack={onBack}/>

      {/* Trofeo */}
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
        }}>¡Conseguiste {completed.length} palabras!</div>
        <div style={{
          marginTop: "var(--space-2)",
          fontSize: "calc(15px * var(--scale))",
          color: "var(--ink-soft)",
          fontWeight: 600,
          textAlign: "center",
        }}>
          {perfect === completed.length
            ? "¡Todas a la primera! 🌟"
            : `${perfect} ${perfect === 1 ? "palabra" : "palabras"} a la primera`}
        </div>
      </div>

      {/* Repaso de las palabras */}
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
          flexWrap: "wrap",
          gap: "var(--space-3)",
          justifyContent: "center",
        }}>
          {completed.map((it, i) => (
            <CompletedChip key={`${it.word}-${i}`} item={it}/>
          ))}
        </div>
      </div>

      {/* Acción principal — el botón "volver" ya está en el header. */}
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

// Trofeo dibujado a lo "ficha de cartón": copa simple con base, asas y estrella.
function Trophy({ size = 160 }) {
  return (
    <div style={{
      width: size,
      animation: "trophy-in 700ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      filter: "drop-shadow(0 6px 0 var(--ink))",
    }}>
      <svg viewBox="0 0 200 220" width="100%" height="auto" aria-hidden>
        {/* asas */}
        <path d="M 50 50 Q 20 50 20 80 Q 20 110 55 115"
          fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round"/>
        <path d="M 150 50 Q 180 50 180 80 Q 180 110 145 115"
          fill="none" stroke="var(--ink)" strokeWidth="6" strokeLinecap="round"/>
        {/* copa */}
        <path d="M 45 35 L 155 35 L 150 110 Q 150 145 100 145 Q 50 145 50 110 Z"
          fill="var(--warn)" stroke="var(--ink)" strokeWidth="6" strokeLinejoin="round"/>
        {/* brillo */}
        <path d="M 65 50 Q 65 90 80 110"
          fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.6"/>
        {/* estrella central */}
        <path d="M 100 65 L 107 80 L 122 82 L 111 92 L 114 107 L 100 100 L 86 107 L 89 92 L 78 82 L 93 80 Z"
          fill="var(--accent-strong)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round"/>
        {/* tronco */}
        <rect x="88" y="145" width="24" height="20" fill="var(--warn)" stroke="var(--ink)" strokeWidth="6"/>
        {/* base */}
        <path d="M 60 165 L 140 165 L 150 195 L 50 195 Z"
          fill="var(--accent)" stroke="var(--ink)" strokeWidth="6" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Slot, SyllableTile, ActionButton — sin cambios estructurales
// ──────────────────────────────────────────────────────────────
function Slot({ value, onClick, status, isCorrect, slotWidth }) {
  const filled = value !== null && value !== undefined;
  const bg = isCorrect ? "var(--ok-soft)"
    : filled ? "var(--surface)"
    : "transparent";
  const borderColor = isCorrect ? "var(--ok)"
    : status === "wrong" && filled ? "var(--accent-strong)"
    : "var(--ink)";
  const borderStyle = filled ? "solid" : "dashed";

  return (
    <button onClick={onClick} disabled={!filled}
      style={{
        minWidth: slotWidth,
        height: 72,
        background: bg,
        border: `3px ${borderStyle} ${borderColor}`,
        borderRadius: "var(--r-md)",
        fontSize: "calc(28px * var(--scale))",
        fontWeight: 700,
        color: "var(--ink)",
        fontFamily: "Andika, Fredoka, sans-serif",
        display: "grid", placeItems: "center",
        transition: "all 200ms ease",
        cursor: filled ? "pointer" : "default",
      }}>
      {value || ""}
    </button>
  );
}

function SyllableTile({ syllable, placed, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="syllable-tile"
      data-placed={placed ? "1" : "0"}
      style={{
        minWidth: 72,
        height: 64,
        padding: "0 var(--space-4)",
        background: placed ? "var(--bg-2)" : "var(--accent)",
        border: `3px solid ${placed ? "var(--ink-soft)" : "var(--ink)"}`,
        borderRadius: "var(--r-md)",
        boxShadow: placed ? "inset 0 2px 4px rgba(0,0,0,0.08)" : "0 4px 0 var(--ink)",
        fontSize: "calc(26px * var(--scale))",
        fontWeight: 700,
        fontFamily: "Andika, Fredoka, sans-serif",
        color: placed ? "var(--ink-faint)" : "var(--ink)",
        opacity: placed ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer",
        transition: "transform 120ms ease, box-shadow 120ms ease, opacity 200ms ease, background 200ms ease",
      }}
    >
      {syllable}
    </button>
  );
}

function ActionButton({ children, onClick, disabled, variant = "primary", icon = "check" }) {
  const isPrimary = variant === "primary";
  const bg = disabled ? "var(--bg-2)"
    : isPrimary ? "var(--ok)" : "var(--surface)";
  const color = disabled ? "var(--ink-faint)" : "var(--ink)";
  const shadow = disabled ? "0 2px 0 var(--ink-faint)" : "0 4px 0 var(--ink)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: "1 1 0",
        maxWidth: 200,
        minHeight: 56,
        padding: "0 var(--space-5)",
        background: bg,
        color,
        border: `3px solid ${disabled ? "var(--ink-faint)" : "var(--ink)"}`,
        borderRadius: "var(--r-lg)",
        boxShadow: shadow,
        fontSize: "calc(18px * var(--scale))",
        fontWeight: 700,
        fontFamily: "Fredoka, sans-serif",
        letterSpacing: "0.01em",
        cursor: disabled ? "default" : "pointer",
        transition: "transform 120ms ease, box-shadow 120ms ease, background 200ms ease",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
      }}
      onPointerDown={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(3px)";
        e.currentTarget.style.boxShadow = "0 1px 0 var(--ink)";
      }}
      onPointerUp={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
      }}
      onPointerLeave={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
      }}
      onPointerCancel={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
      }}
    >
      {isPrimary && !disabled && icon === "check" && (
        <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
          <path d="M 4 10 L 8 14 L 16 6" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {isPrimary && !disabled && icon === "reload" && (
        // Reload — flecha circular tipo "recargar página", abierta arriba a la derecha con punta.
        <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
          <path
            d="M 16 4 L 16 8 L 12 8"
            stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M 16 8 A 6 6 0 1 0 14.5 13.5"
            stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round"
          />
        </svg>
      )}
      {children}
    </button>
  );
}

window.WordBuilder = WordBuilder;

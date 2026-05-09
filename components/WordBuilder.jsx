// Constructor de palabras — la mecánica más simple
// Niño ve imagen + escucha palabra → arrastra/clica sílabas en orden
//
// Sesión: 10 palabras barajadas. Tras cada acierto, auto-avance (~1.4s)
// con la palabra "volando" hacia la lista inferior de logros. Al completar
// las 10, pantalla de trofeo con opción de volver a jugar o salir al menú.

const SESSION_SIZE = 10;

// ──────────────────────────────────────────────────────────────
// Feedback no-visual: audio + vibración háptica.
// Refuerza el resultado para niños con baja visión o daltonismo,
// y respeta `prefers-reduced-motion` (que también silencia el audio).
// ──────────────────────────────────────────────────────────────
let _audioCtx = null;
function playFeedback(kind) {
  // Reduced motion implica también “sin chispitas” — silenciamos audio.
  const reduced = typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Haptics: corto al acertar, patrón doble al fallar
  try {
    if (navigator.vibrate) {
      navigator.vibrate(kind === "correct" ? 40 : [60, 40, 60]);
    }
  } catch (e) { /* noop */ }
  if (reduced) return;
  try {
    _audioCtx = _audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = _audioCtx;
    if (ctx.state === "suspended") ctx.resume();
    const now = ctx.currentTime;
    // Notas en sine + gain envelope corto. Volumen bajo.
    // Sonido suave: triangle (más cálido que sine), volumen muy bajo,
    // ataque y caída largos para evitar el "click" duro al inicio.
    const isCorrect = kind === "correct";
    // Correcto: dos notas musicales (Mi5 → Sol5) con caída larga, tipo campanilla suave.
    // Error: descenso corto en triangle a frecuencia baja.
    const tones = isCorrect
      ? [{ f: 659, t: 0,    dur: 0.32 }, { f: 784, t: 0.09, dur: 0.36 }]
      : [{ f: 280, t: 0,    dur: 0.18 }, { f: 200, t: 0.08, dur: 0.20 }];
    const peak = isCorrect ? 0.08 : 0.18;
    tones.forEach(({ f, t, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = isCorrect ? "triangle" : "sine";
      osc.frequency.setValueAtTime(f, now + t);
      gain.gain.setValueAtTime(0.0001, now + t);
      // Ataque suave (~30ms) en lugar de instantáneo
      gain.gain.exponentialRampToValueAtTime(peak, now + t + 0.03);
      // Caída larga para que no resulte "punzante"
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + t);
      osc.stop(now + t + dur + 0.02);
    });
  } catch (e) { /* sin audio = sin audio */ }
}

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

function WordBuilder({ onBack, exampleWord, debug = false }) {
  const allWords = window.SUPEINGO_CONTENT.words;
  // Palabra forzada por el panel de depuración (null = comportamiento normal)
  const [debugForced, setDebugForced] = useState(null);

  // Construimos una sesión de 10 palabras al montar
  const [sessionSeed, setSessionSeed] = useState(0);
  const session = useMemo(() => {
    // Si vienen con `exampleWord` o el panel de depuración fuerza una
    // palabra, la ponemos primera. `debugForced` gana sobre `exampleWord`.
    const forced = debugForced || exampleWord;
    const built = buildSession(allWords);
    if (forced) {
      const idx = built.findIndex(w => w.word === forced);
      if (idx > 0) {
        const [w] = built.splice(idx, 1);
        built.unshift(w);
      } else if (idx === -1) {
        const ex = allWords.find(w => w.word === forced);
        if (ex) built.unshift(ex);
      }
    }
    return built.slice(0, SESSION_SIZE);
    // eslint-disable-next-line
  }, [sessionSeed, debugForced]);

  const [idx, setIdx] = useState(0);
  const sessionDone = idx >= session.length;
  // Si idx se sale del rango, usamos un placeholder para que los hooks
  // siguientes (useMemo, useEffect) no revienten al desreferenciar
  // target.word / target.syllables. La pantalla real de fin de sesión
  // se renderiza más abajo con un early-return ANTES del JSX principal.
  const target = session[idx] || { word: "", syllables: [], emoji: "", svg: null };

  // Histórico de aciertos en esta sesión: [{ word, syllables, emoji, attempts }]
  const [completed, setCompleted] = useState([]);
  const [attempts, setAttempts] = useState(1); // intentos para la palabra actual

  // Banco de sílabas: SIEMPRE 9 fichas en el banco.
  //  - Correctas (todas las de la palabra).
  //  - Decoys obligatorias declaradas en data/words.js (parejas confusas
  //    como LE/RE, BA/VA, J/G…). Aparecen siempre que esta palabra salga.
  //  - El resto se rellena con sílabas al azar de otras palabras hasta 9.
  const POOL_SIZE = 9;
  const pool = useMemo(() => {
    const correct = target.syllables;
    const decoys = (target.decoys || []).filter(s => !correct.includes(s));
    const fixed = [...correct, ...decoys];
    const fixedSet = new Set(fixed);
    // Candidatas para relleno: sílabas de OTRAS palabras que no estén ya en el banco.
    const others = allWords
      .filter(w => w.word !== target.word)
      .flatMap(w => w.syllables)
      .filter(s => !fixedSet.has(s));
    // Barajamos `others` y vamos cogiendo únicas hasta llegar a POOL_SIZE.
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    const all = [...fixed];
    const seen = new Set(fixed);
    for (const s of others) {
      if (all.length >= POOL_SIZE) break;
      if (!seen.has(s)) { all.push(s); seen.add(s); }
    }
    // Barajado final para que las correctas no salgan agrupadas al inicio.
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
  // Sílabas (por id de pool) ocultadas para reducir dificultad tras 3 fallos.
  // Se resetea al cambiar de palabra. Empezamos a esconder a partir del 4º intento.
  const [hiddenIds, setHiddenIds] = useState(new Set());
  // Ref expuesta por SpeakButton: nos permite disparar la pronunciación
  // (con su animación) desde el click en cualquier parte del card.
  const speakRef = useRef(null);
  // Reset al cambiar de palabra: dificultad arranca de cero en cada palabra nueva.
  useEffect(() => { setHiddenIds(new Set()); }, [target.word]);

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
  const hasPlaced = placed.length > 0;

  const handlePick = (id) => {
    if (status !== "idle") return;
    if (placed.includes(id)) {
      setPlaced(placed.filter(x => x !== id));
    } else {
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
    if (status !== "idle" || !hasPlaced) return;
    const ok = placedSyllables.join("") === target.syllables.join("");
    if (ok) {
      playFeedback("correct");
      setStatus("correct");
      setConfettiOn(true);
      setTimeout(() => speak(target.word), 250);

      // Tras la celebración, registramos y avanzamos
      const wordRecord = {
        word: target.word,
        syllables: target.syllables,
        emoji: target.emoji,
        svg: target.svg,
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
      playFeedback("wrong");
      setStatus("wrong");
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      // A partir del 4º intento (= tras 3 fallos), escondemos una sílaba
      // incorrecta para bajar la dificultad. Si ya no quedan incorrectas,
      // dejamos el banco como está y el niño sigue intentando ad infinitum.
      if (nextAttempts >= 4) {
        setHiddenIds(prev => {
          const wrong = pool.filter(p =>
            !target.syllables.includes(p.syllable) && !prev.has(p.id)
          );
          if (wrong.length === 0) return prev;
          const pick = wrong[Math.floor(Math.random() * wrong.length)];
          const next = new Set(prev);
          next.add(pick.id);
          return next;
        });
      }
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
      <WordBuilderSessionComplete
        completed={completed}
        onPlayAgain={restartSession}
        onBack={onBack}
      />
    );
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>

      <ScreenHeader title="Forma palabras" onBack={onBack}/>

      {/* Imagen + altavoz — todo el card es pulsable: clic en cualquier
          parte hace que la palabra se pronuncie. El altavoz se anima
          igual aunque pulses fuera de él, para que quede claro que el
          sonido sale de ahí. */}
      {/* Card pulsable. Usamos <div role="button"> en lugar de <button>
          porque dentro va un SpeakButton (otro <button>) y HTML no
          permite anidar buttons. Mantenemos accesibilidad con
          tabIndex + onKeyDown. */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => speakRef.current && speakRef.current()}
        onKeyDown={e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            speakRef.current && speakRef.current();
          }
        }}
        aria-label={`Escuchar ${target.word}`}
        style={{
          margin: "var(--space-3) var(--space-4) var(--space-3)",
          background: "var(--surface)",
          border: "3px solid var(--ink)",
          borderRadius: "var(--r-xl)",
          boxShadow: "var(--shadow-md)",
          padding: "var(--space-3) var(--space-4)",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-4)",
          position: "relative",
          zIndex: 2,
          width: "calc(100% - var(--space-4) * 2)",
          boxSizing: "border-box",
          cursor: "pointer",
          transition: "transform 120ms ease, box-shadow 120ms ease",
        }}
        onPointerDown={e => {
          e.currentTarget.style.transform = "translateY(2px)";
          e.currentTarget.style.boxShadow = "0 2px 0 rgba(42,42,51,0.12)";
        }}
        onPointerUp={e => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onPointerLeave={e => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
        onPointerCancel={e => {
          e.currentTarget.style.transform = "";
          e.currentTarget.style.boxShadow = "var(--shadow-md)";
        }}
      >
        <div
          id="wb-emoji"
          style={{
            animation: status === "correct" ? "pop 600ms ease-out" : "bob 2.4s ease-in-out infinite",
            opacity: status === "flying" ? 0 : 1,
            transition: "opacity 200ms ease",
            // El filter drop-shadow lo aplica WordImage internamente para
            // SVGs; para emojis lo replicamos aquí para mantener look.
            filter: target.svg ? "none" : "drop-shadow(0 4px 6px rgba(0,0,0,0.08))",
            fontSize: "calc(64px * var(--scale))",
            lineHeight: 1,
          }}
          aria-hidden
        ><WordImage entry={target} size={64}/></div>
        <SpeakButton text={target.word} size={48} triggerRef={speakRef}/>
      </div>

      {/* Zona de respuesta — sin pistas sobre cuántas sílabas hay */}
      <AnswerArea
        placedSyllables={placedSyllables}
        onRemove={handleSlotClick}
        status={status}
        isCorrect={status === "correct" || status === "flying"}
      />

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
        margin: "var(--space-3) var(--space-4) 0",
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
        {pool.filter(p => !hiddenIds.has(p.id)).map(p => (
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
          icon="clear"
          onClick={handleClear}
          disabled={placed.length === 0 || status !== "idle"}
        >
          Borrar
        </ActionButton>
        <ActionButton
          variant="primary"
          onClick={handleCheck}
          disabled={!hasPlaced || status !== "idle"}
        >
          Comprobar
        </ActionButton>
      </div>

      <Confetti active={confettiOn}/>

      {/* Lista inferior de palabras conseguidas */}
      {completed.length > 0 && (
        <CompletedList items={completed} total={session.length}/>
      )}

      {/* Animación de "vuelo" — la palabra acertada baja hacia la lista */}
      {flyingWord && (
        <FlyingChip word={flyingWord}/>
      )}

      {/* Panel de depuración — solo si está activo el modo debug. Permite
          forzar la palabra que aparece primero en la sesión. */}
      {debug && (
        <DebugWordPicker
          allWords={allWords}
          current={target.word}
          onPick={(word) => {
            // Reiniciamos sesión completa con la palabra forzada al frente.
            setDebugForced(word);
            setCompleted([]);
            setIdx(0);
            setPlaced([]);
            setAttempts(1);
            setStatus("idle");
            setSessionSeed(s => s + 1);
          }}
        />
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// DebugWordPicker — panel flotante (solo en modo depuración) que
// permite saltar a cualquier palabra del diccionario sin tener que
// recargar la sesión hasta que salga al azar.
// ──────────────────────────────────────────────────────────────
function DebugWordPicker({ allWords, current, onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase();
    if (!q) return allWords;
    return allWords.filter(w => w.word.includes(q));
  }, [allWords, query]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Depuración: elegir palabra"
        style={{
          position: "fixed",
          left: 12, bottom: 12,
          zIndex: 90,
          background: "#1a1c20",
          color: "#f0c674",
          border: "1px solid #444",
          borderRadius: 8,
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "ui-monospace, monospace",
          fontWeight: 700,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >🐞 {current || "?"}</button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="Depuración: elegir palabra"
      style={{
        position: "fixed",
        left: 12, bottom: 12,
        width: 260,
        maxHeight: "60vh",
        zIndex: 90,
        background: "#1a1c20",
        color: "#e8eaed",
        border: "1px solid #444",
        borderRadius: 10,
        boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", gap: 6,
        padding: "8px 10px",
        borderBottom: "1px solid #333",
        fontWeight: 700,
        color: "#f0c674",
      }}>
        🐞 DEBUG · palabra
        <button
          onClick={() => setOpen(false)}
          style={{
            marginLeft: "auto",
            background: "transparent", color: "#9ca0aa",
            border: 0, cursor: "pointer", fontSize: 14,
          }}
          aria-label="Cerrar"
        >×</button>
      </div>
      <input
        type="text"
        autoFocus
        placeholder="Filtrar…"
        value={query}
        onChange={e => setQuery(e.target.value)}
        style={{
          margin: 8,
          padding: "6px 8px",
          background: "#0f1114",
          color: "#e8eaed",
          border: "1px solid #333",
          borderRadius: 6,
          font: "inherit",
        }}
      />
      <div style={{
        overflowY: "auto",
        padding: "0 4px 8px",
      }}>
        {filtered.length === 0 && (
          <div style={{ padding: "8px 10px", color: "#9ca0aa" }}>Sin resultados</div>
        )}
        {filtered.map(w => {
          const active = w.word === current;
          return (
            <button
              key={w.word}
              onClick={() => { onPick(w.word); setOpen(false); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                width: "100%",
                padding: "5px 8px",
                background: active ? "#2a3340" : "transparent",
                color: active ? "#f0c674" : "#e8eaed",
                border: 0,
                borderRadius: 4,
                cursor: "pointer",
                font: "inherit",
                textAlign: "left",
              }}
            >
              <span style={{ width: 18, textAlign: "center" }}>{w.svg ? "🖼" : (w.emoji || "·")}</span>
              <span style={{ fontWeight: 700 }}>{w.word}</span>
              <span style={{ marginLeft: "auto", color: "#7a808a" }}>{w.syllables.join("·")}</span>
            </button>
          );
        })}
      </div>
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
function CompletedList({ items, total }) {
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
        gap: 10,
        marginBottom: "var(--space-2)",
        color: "var(--ink-soft)",
        fontSize: "calc(12px * var(--scale))",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>
        <span>Acertadas</span>
        {total != null
          ? <SessionProgress current={items.length} total={total}/>
          : <span style={{
              color: "var(--ink-faint)",
              fontWeight: 600,
              textTransform: "none",
              letterSpacing: 0,
            }}>{items.length}</span>}
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
          <CompletedChip key={`${it.word}-${i}`} item={it} isLatest={i === items.length - 1} showAttempts={false}/>
        ))}
      </div>
    </div>
  );
}

function CompletedChip({ item, isLatest, showAttempts = true }) {
  const { word, syllables, attempts } = item;
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
      <WordImage entry={item} size={28} scale={false}/>
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
      {showAttempts && (
        <AttemptsBadge attempts={attempts} perfect={perfect}/>
      )}
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
        <WordImage entry={word} size={32} scale={false}/>
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
function WordBuilderSessionComplete({ completed, onPlayAgain, onBack }) {
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
          flexDirection: "column",
          gap: "var(--space-3)",
          alignItems: "flex-start",
        }}>
          {completed.map((it, i) => (
            <CompletedChip key={`${it.word}-${i}`} item={it} showAttempts={true}/>
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
      <svg viewBox="0 0 200 220" width="100%" style={{ height: "auto" }} aria-hidden>
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
// AnswerArea — caja única que muestra las sílabas colocadas.
// No revela cuántas sílabas tiene la palabra. Para evitar que el
// recuadro cambie de alto (lo que desplazaba el banco de sílabas
// debajo y provocaba misclicks), usa ALTURA FIJA y construye la
// palabra en línea con separadores · — ocupa mucho menos espacio
// que renderizar cada sílaba como botón con borde, así que rara
// vez salta a una segunda fila aunque la palabra sea larga.
// Cada sílaba sigue siendo pulsable para quitarla.
// ──────────────────────────────────────────────────────────────
function AnswerArea({ placedSyllables, onRemove, status, isCorrect }) {
  const empty = placedSyllables.length === 0;
  const borderColor = isCorrect ? "var(--ok)"
    : status === "wrong" ? "var(--accent-strong)"
    : "var(--ink-faint)";
  // Discontinuo en estado neutro (vacío o construyendo); solo se vuelve
  // continuo cuando hay feedback claro (correcto o error).
  const solid = isCorrect || status === "wrong";
  const bg = isCorrect ? "var(--ok-soft)" : "var(--surface)";

  // Auto-shrink para palabras muy largas: a partir de ~12 chars totales
  // (sumando sílabas + separadores) bajamos el tamaño un punto, así casi
  // siempre cabe en una línea y la caja mantiene su alto.
  const totalChars = placedSyllables.reduce((n, s) => n + s.length, 0)
    + Math.max(0, placedSyllables.length - 1);
  const fontPx = totalChars > 14 ? 22 : totalChars > 11 ? 25 : 28;

  return (
    <div style={{
      margin: "0 var(--space-4)",
      padding: "0 var(--space-3)",
      background: bg,
      border: `3px ${solid ? "solid" : "dashed"} ${borderColor}`,
      borderRadius: "var(--r-md)",
      // Altura FIJA — no depende del contenido. Así el banco de sílabas
      // de debajo nunca se mueve entre 0/1/N sílabas seleccionadas.
      height: 64,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      position: "relative",
      zIndex: 2,
      animation: status === "wrong" ? "shake 360ms ease-in-out" : "none",
      transition: "border-color 200ms ease, background 200ms ease",
      overflow: "hidden",
    }}>
      {empty ? (
        <span style={{
          color: "var(--ink-faint)",
          fontWeight: 600,
          fontSize: "calc(15px * var(--scale))",
          fontFamily: "Andika, Fredoka, sans-serif",
        }}>
          Pulsa una sílaba ↓
        </span>
      ) : (
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          fontFamily: "Andika, Fredoka, sans-serif",
          fontSize: `calc(${fontPx}px * var(--scale))`,
          fontWeight: 700,
          color: "var(--ink)",
          lineHeight: 1.1,
          letterSpacing: "0.02em",
          maxWidth: "100%",
          flexWrap: "nowrap",
        }}>
          {placedSyllables.map((s, i) => (
            <React.Fragment key={i}>
              <button
                onClick={() => onRemove(i)}
                disabled={status !== "idle"}
                aria-label={`Quitar ${s}`}
                style={{
                  background: "transparent",
                  border: "none",
                  // Padding generoso vertical para hit-target sin crecer
                  // la altura de la caja (height fija en el contenedor).
                  padding: "8px 6px",
                  margin: 0,
                  font: "inherit",
                  color: "inherit",
                  cursor: status === "idle" ? "pointer" : "default",
                  borderRadius: 6,
                  whiteSpace: "nowrap",
                  WebkitTapHighlightColor: "transparent",
                }}
                onPointerDown={e => {
                  if (status !== "idle") return;
                  e.currentTarget.style.background = "var(--bg-2)";
                }}
                onPointerUp={e => { e.currentTarget.style.background = "transparent"; }}
                onPointerLeave={e => { e.currentTarget.style.background = "transparent"; }}
                onPointerCancel={e => { e.currentTarget.style.background = "transparent"; }}
              >{s}</button>
              {i < placedSyllables.length - 1 && (
                <span aria-hidden style={{
                  color: "var(--ink-faint)",
                  fontWeight: 500,
                  pointerEvents: "none",
                  // Un pelín más pequeño que las sílabas, como en
                  // CompletedChip y FlyingChip, para mantener el ritmo.
                  fontSize: "0.85em",
                  padding: "0 1px",
                }}>·</span>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Slot, SyllableTile, ActionButton — sin cambios estructurales
// ──────────────────────────────────────────────────────────────
function Slot({ value, onClick, status, isCorrect }) {
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
        flex: "1 1 0",
        minWidth: 0,
        maxWidth: 110,
        height: 60,
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
  // Primario en azul-gris (no verde) para no chocar con el feedback
  // "correcto" (verde) ni con el "error" (coral). Mejora la accesibilidad
  // para daltónicos: el color del botón nunca se confunde con el resultado.
  const bg = disabled ? "var(--bg-2)"
    : isPrimary ? "var(--secondary-strong)" : "var(--surface)";
  const color = disabled ? "var(--ink-faint)"
    : isPrimary ? "#FFFDF7" : "var(--ink)";
  // Stroke de iconos: hereda del color del texto para que se vea siempre.
  const strokeColor = color;
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
      {/* Icono SIEMPRE presente (también en disabled) — el icono es parte
          de la identidad del botón. El color sigue al texto para que el
          contraste sea correcto en cualquier estado. */}
      {icon === "check" && (
        <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
          <path d="M 4 10 L 8 14 L 16 6" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {icon === "reload" && (
        // Reload — flecha circular tipo "recargar página", abierta arriba a la derecha con punta.
        <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
          <path
            d="M 16 4 L 16 8 L 12 8"
            stroke={strokeColor} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M 16 8 A 6 6 0 1 0 14.5 13.5"
            stroke={strokeColor} strokeWidth="2.5" fill="none" strokeLinecap="round"
          />
        </svg>
      )}
      {icon === "clear" && (
        // Clear / Borrar — aspa simple, semantica de "quitar" sin connotación de error
        <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden>
          <path d="M 5 5 L 15 15 M 15 5 L 5 15" stroke={strokeColor} strokeWidth="3" fill="none" strokeLinecap="round"/>
        </svg>
      )}
      {icon === "hint" && (
        // Pista — emoji 🔍 para reforzar la metáfora visual del menú
        // (GuessWord usa la lupa). Tamaño pequeño para no competir con
        // los iconos SVG monocromos de los otros botones.
        <span aria-hidden style={{ fontSize: 18, lineHeight: 1 }}>🔍</span>
      )}
      {children}
    </button>
  );
}

// Exportamos también los helpers reutilizables para que otros juegos
// (FindPicture, etc.) los usen sin redefinir. Cada `<script type="text/babel">`
// vive en su propio scope tras la transpilación.
Object.assign(window, {
  WordBuilder,
  playFeedback,
  SessionProgress,
  CompletedList,
  CompletedChip,
  AttemptsBadge,
  FlyingChip,
  WordBuilderSessionComplete,
  DebugWordPicker,
});

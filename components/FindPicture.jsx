// "Busca el dibujo" — inverso de Forma palabras.
// El niño ve la palabra silabeada (con · separadores) y la escucha;
// elige el dibujo correcto entre 6 opciones (cuadrícula 3×2).
// Sin decoys curados: las opciones erróneas son palabras al azar del
// diccionario distintas de la respuesta. Silabeo siempre visible.

const FP_SESSION_SIZE = 10;
const FP_GRID_SIZE = 6;

// Categorías que aparecen en este juego. El niño solo verá palabras
// (y opciones erróneas) de estas categorías — así las 6 imágenes en
// pantalla son siempre del mismo "mundo" (animales con animales,
// vegetales con vegetales) y la elección es por reconocimiento, no por
// descarte trivial. Excluimos categorías con pocas entradas o muy
// abstractas (cuerpo: difícil de iconografiar bien con emoji;
// fantasia: heterogénea; musica: mezcla instrumentos y juegos).
const FP_CATEGORIES = ["animales", "vegetales", "naturaleza", "transporte", "ropa"];

function _fpShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _fpBuildSession(allWords) {
  const shuffled = _fpShuffle(allWords);
  if (shuffled.length >= FP_SESSION_SIZE) return shuffled.slice(0, FP_SESSION_SIZE);
  const out = [];
  while (out.length < FP_SESSION_SIZE) out.push(..._fpShuffle(allWords));
  return out.slice(0, FP_SESSION_SIZE);
}

function FindPicture({ onBack, debug = false }) {
  // Solo entradas de las categorías habilitadas para este juego, y solo
  // las que tienen dibujo o emoji (para no enseñar placeholders).
  const allEntries = useMemo(() => {
    const cats = new Set(FP_CATEGORIES);
    return window.SUPEINGO_CONTENT.dictionary.filter(
      e => (e.categories || []).some(c => cats.has(c)) && (e.svg || e.emoji) && !isScaryEntry(e)
    );
  }, []);
  // Índice por categoría dentro del subconjunto habilitado — se usa
  // para elegir las 5 opciones erróneas del mismo grupo que el target.
  // Una palabra con varias categorías aparece en cada uno de sus bins.
  const entriesByCategory = useMemo(() => {
    const idx = {};
    for (const e of allEntries) {
      for (const c of (e.categories || [])) {
        (idx[c] = idx[c] || []).push(e);
      }
    }
    return idx;
  }, [allEntries]);
  const [debugForced, setDebugForced] = useState(null);

  const [sessionSeed, setSessionSeed] = useState(0);
  const session = useMemo(() => {
    const built = _fpBuildSession(allEntries);
    const forced = debugForced;
    if (forced) {
      const i = built.findIndex(w => w.word === forced);
      if (i > 0) { const [w] = built.splice(i, 1); built.unshift(w); }
      else if (i === -1) {
        const ex = allEntries.find(w => w.word === forced);
        if (ex) built.unshift(ex);
      }
    }
    return built.slice(0, FP_SESSION_SIZE);
    // eslint-disable-next-line
  }, [sessionSeed, debugForced]);

  const [idx, setIdx] = useState(0);
  const sessionDone = idx >= session.length;
  const target = session[idx] || { word: "", syllables: [], emoji: "", svg: null, categories: [] };
  // Auto-shrink discreto del rótulo según longitud (letras + separadores ·)
  // para que palabras como ZANAHORIA o HELICÓPTERO no toquen los bordes.
  const _vlen = target.word.length + Math.max(0, target.syllables.length - 1);
  const targetFontPx = _vlen <= 9 ? 34 : _vlen <= 12 ? 28 : 24;

  const [completed, setCompleted] = useState([]);
  const [attempts, setAttempts] = useState(1);
  const [status, setStatus] = useState("idle"); // idle | correct | wrong | flying
  const [picked, setPicked] = useState(null); // word del icono pulsado (para feedback)
  const [confettiOn, setConfettiOn] = useState(false);
  const [flyingWord, setFlyingWord] = useState(null);
  const speakRef = useRef(null);

  // Cuadrícula de 6 iconos: el correcto + 5 al azar DE LA MISMA
  // CATEGORÍA. Si la categoría no llega a 6 entradas, completamos con
  // otras del juego (no debería pasar en la práctica con las
  // categorías habilitadas, pero protegemos por si acaso).
  const choices = useMemo(() => {
    if (!target.word) return [];
    // Una entrada puede tener varias categorías; consideramos "misma
    // categoría" cualquiera que comparta al menos una con el target.
    // Como `entriesByCategory` ya tiene a la palabra en cada uno de
    // sus bins, juntamos todos los bins del target y deduplicamos.
    const targetCats = target.categories || [];
    const sameCatSet = new Set();
    for (const c of targetCats) {
      for (const e of (entriesByCategory[c] || [])) {
        if (e.word !== target.word) sameCatSet.add(e);
      }
    }
    let wrong = _fpShuffle([...sameCatSet]).slice(0, FP_GRID_SIZE - 1);
    if (wrong.length < FP_GRID_SIZE - 1) {
      const fillers = allEntries.filter(e =>
        e.word !== target.word
        && !wrong.includes(e)
        && !(e.categories || []).some(c => targetCats.includes(c))
      );
      wrong = wrong.concat(_fpShuffle(fillers).slice(0, FP_GRID_SIZE - 1 - wrong.length));
    }
    return _fpShuffle([target, ...wrong]);
    // eslint-disable-next-line
  }, [target.word, idx]);

  // Pronunciar al cambiar de palabra
  useEffect(() => {
    if (!target.word) return;
    let cancelled = false;
    (async () => {
      if (typeof whenTTSReady === "function") await whenTTSReady();
      if (cancelled) return;
      setTimeout(() => { if (!cancelled) speak(target.word); }, 150);
    })();
    return () => { cancelled = true; };
  }, [target.word]);

  const handlePick = (entry) => {
    if (status !== "idle") return;
    setPicked(entry.word);
    if (entry.word === target.word) {
      playFeedback("correct");
      setStatus("correct");
      setConfettiOn(true);
      setTimeout(() => speak(target.word), 250);

      const record = {
        word: target.word,
        syllables: target.syllables,
        emoji: target.emoji,
        svg: target.svg,
        image: target.image,
        attempts,
      };

      setTimeout(() => {
        setFlyingWord(record);
        setStatus("flying");
      }, 950);
      setTimeout(() => {
        setCompleted(c => [...c, record]);
        setFlyingWord(null);
        setConfettiOn(false);
        setIdx(i => i + 1);
        setPicked(null);
        setAttempts(1);
        setStatus("idle");
      }, 1500);
    } else {
      playFeedback("wrong");
      setStatus("wrong");
      setAttempts(a => a + 1);
      setTimeout(() => {
        setPicked(null);
        setStatus("idle");
      }, 900);
    }
  };

  const restartSession = () => {
    setCompleted([]);
    setIdx(0);
    setPicked(null);
    setAttempts(1);
    setStatus("idle");
    setSessionSeed(s => s + 1);
  };

  if (sessionDone) {
    return <FindPictureSessionComplete
      completed={completed}
      onPlayAgain={restartSession}
      onBack={onBack}
    />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>

      <ScreenHeader title="Busca el dibujo" onBack={onBack}/>

      {/* Card central: palabra silabeada + altavoz. Pulsable entera.
          Usamos <div role="button"> en lugar de <button> porque dentro
          va un SpeakButton (otro <button>) y HTML no permite anidar
          buttons. Mantenemos accesibilidad con tabIndex + onKeyDown. */}
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
          padding: "var(--space-4) var(--space-4)",
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
        onPointerUp={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
        onPointerLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
        onPointerCancel={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      >
        <span style={{
          flex: 1,
          fontFamily: "Andika, Fredoka, sans-serif",
          fontWeight: 700,
          fontSize: `calc(${targetFontPx}px * var(--scale))`,
          lineHeight: 1.1,
          letterSpacing: "0.03em",
          color: "var(--ink)",
          textAlign: "center",
          // Auto-shrink suave para palabras largas
          wordBreak: "keep-all",
        }}>
          {target.syllables.map((s, i) => (
            <React.Fragment key={i}>
              <span>{s}</span>
              {i < target.syllables.length - 1 && (
                <span aria-hidden style={{
                  color: "var(--ink-faint)", fontWeight: 500,
                  margin: "0 0.05em",
                }}>·</span>
              )}
            </React.Fragment>
          ))}
        </span>
        <SpeakButton text={target.word} size={40} triggerRef={speakRef}/>
      </div>

      {/* Cuadrícula 3×2 de dibujos — envuelta en el mismo recuadro
          discontinuo de fondo suave que el banco de sílabas de
          "Forma palabras", para que ambos juegos compartan vocabulario
          visual. */}
      <div style={{
        margin: "var(--space-3) var(--space-4) 0",
        padding: "var(--space-3)",
        background: "var(--bg-2)",
        border: "3px dashed var(--ink-faint)",
        borderRadius: "var(--r-lg)",
        position: "relative",
        zIndex: 2,
      }}>
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "var(--space-3)",
        }}>
        {choices.map((entry, i) => {
          const isPicked = picked === entry.word;
          // Solo pintamos en verde el icono al ACERTAR; en estado
          // "wrong" no resaltamos la respuesta correcta — el niño
          // ya se está concentrando en su elección, queremos que
          // siga buscando, no que aprenda por descarte visual.
          const isCorrect = (status === "correct" || status === "flying")
            && entry.word === target.word;
          const isWrongPick = isPicked && status === "wrong";
          // Borde según feedback
          const borderColor = isCorrect ? "var(--ok)"
            : isWrongPick ? "var(--accent-strong)"
            : "var(--ink)";
          const bg = isCorrect ? "var(--ok-soft)"
            : isWrongPick ? "var(--accent)"
            : "var(--surface)";
          return (
            <button
              key={`${entry.word}-${i}`}
              onClick={() => handlePick(entry)}
              disabled={status !== "idle"}
              aria-label={entry.word}
              style={{
                aspectRatio: "1 / 1",
                background: bg,
                border: `3px solid ${borderColor}`,
                borderRadius: "var(--r-md)",
                // Solo la carta INVOLUCRADA en el feedback (la pulsada o la
                // correcta resaltada) se hunde; las demás conservan su shadow
                // normal aunque el status global no sea "idle".
                boxShadow: (isPicked || isCorrect) ? "0 2px 0 var(--ink)" : "0 4px 0 var(--ink)",
                display: "grid",
                placeItems: "center",
                cursor: status === "idle" ? "pointer" : "default",
                transition: "transform 120ms ease, box-shadow 120ms ease, background 200ms ease, border-color 200ms ease",
                animation: isWrongPick ? "shake 360ms ease-in-out" : "none",
              }}
              onPointerDown={e => {
                if (status !== "idle") return;
                e.currentTarget.style.transform = "translateY(3px)";
                e.currentTarget.style.boxShadow = "0 1px 0 var(--ink)";
              }}
              onPointerUp={e => {
                if (status !== "idle") return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
              }}
              onPointerLeave={e => {
                if (status !== "idle") return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
              }}
              onPointerCancel={e => {
                if (status !== "idle") return;
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
              }}
            >
              {/* Icono más grande para que ocupe más del bloque
                  (el ratio anterior 56/aspectRatio dejaba mucho aire). */}
              <WordImage entry={entry} size={72}/>
            </button>
          );
        })}
        </div>
      </div>

      {/* Pista textual */}
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

      <Confetti active={confettiOn}/>
      {completed.length > 0 && <CompletedList items={completed} total={session.length}/>}
      {flyingWord && <FlyingChip word={flyingWord}/>}

      {/* Selector de palabra (debug) — solo si está activo el modo
          depuración en Ajustes. Reutiliza el panel del WordBuilder. */}
      {debug && (
        <DebugWordPicker
          allWords={allEntries}
          current={target.word}
          onPick={(w) => {
            setDebugForced(w);
            setCompleted([]);
            setIdx(0);
            setPicked(null);
            setAttempts(1);
            setStatus("idle");
            setSessionSeed(s => s + 1);
          }}
        />
      )}
    </div>
  );
}

// Pantalla fin de sesión de "Busca el dibujo" — igual que la de
// WordBuilder pero sin el subtítulo "X palabras a la primera"; el
// check verde junto a cada palabra se muestra siempre como refuerzo
// positivo (forzamos attempts:1 al construir el chip), independiente
// de cuántos intentos costó cada acierto.
function FindPictureSessionComplete({ completed, onPlayAgain, onBack }) {
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
          fontSize: "calc(28px * var(--scale))",
          fontWeight: 700,
          fontFamily: "Fredoka, sans-serif",
          textAlign: "center",
        }}>¡Conseguiste {completed.length} palabras!</div>
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
          alignItems: "flex-start",
        }}>
          {completed.map((it, i) => (
            <CompletedChip
              key={`${it.word}-${i}`}
              item={{ ...it, attempts: 1 }}
              showAttempts={true}/>
          ))}
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

window.FindPicture = FindPicture;

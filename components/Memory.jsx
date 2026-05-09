// "Memoria" — encuentra parejas.
// Tablero 3×4 (12 cartas, 6 parejas) boca abajo. Al voltear dos
// cartas iguales, la palabra suena y aparece grande en pantalla
// antes de moverse a la lista de acertadas.
//
// Pool: mismas categorías habilitadas que FindPicture, así el
// banco visual de los juegos es coherente.

const MEM_PAIRS = 6;
const MEM_CATEGORIES = ["animales", "vegetales", "naturaleza", "transporte", "ropa"];

function _memShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _memBuildBoard(allEntries) {
  const picks = _memShuffle(allEntries).slice(0, MEM_PAIRS);
  const cards = [];
  picks.forEach((entry, i) => {
    cards.push({ id: i * 2,     entry, flipped: false, matched: false });
    cards.push({ id: i * 2 + 1, entry, flipped: false, matched: false });
  });
  return _memShuffle(cards);
}

function Memory({ onBack }) {
  const allEntries = useMemo(() => {
    const cats = new Set(MEM_CATEGORIES);
    return window.SUPEINGO_CONTENT.dictionary.filter(
      e => cats.has(e.category) && (e.svg || e.emoji)
    );
  }, []);

  const [sessionSeed, setSessionSeed] = useState(0);
  const [cards, setCards] = useState(() => _memBuildBoard(allEntries));
  useEffect(() => {
    setCards(_memBuildBoard(allEntries));
  }, [sessionSeed, allEntries]);

  const [selected, setSelected] = useState([]);  // [cardId, cardId]
  const [completed, setCompleted] = useState([]);
  // idle | checking (mismatch, esperando que se den la vuelta)
  // | celebrating (match, mostrando refuerzo)
  const [status, setStatus] = useState("idle");
  const [reveal, setReveal] = useState(null);    // entry mostrada en overlay central
  const [flyingWord, setFlyingWord] = useState(null);
  const [confettiOn, setConfettiOn] = useState(false);

  const sessionDone = completed.length >= MEM_PAIRS;

  const handleClick = (card) => {
    if (status !== "idle") return;
    if (card.flipped || card.matched) return;
    if (selected.includes(card.id)) return;

    // Voltear la carta tocada
    setCards(cs => cs.map(c => c.id === card.id ? { ...c, flipped: true } : c));
    const next = [...selected, card.id];
    setSelected(next);

    if (next.length < 2) return;

    // Segunda carta — comparar con la primera
    const cardA = cards.find(c => c.id === selected[0]);
    const cardB = card;
    const isMatch = cardA && cardA.entry.word === cardB.entry.word;

    if (isMatch) {
      setStatus("celebrating");
      playFeedback("correct");
      setReveal(cardA.entry);
      setConfettiOn(true);
      setTimeout(() => speak(cardA.entry.word), 250);

      const record = {
        word: cardA.entry.word,
        syllables: cardA.entry.syllables,
        emoji: cardA.entry.emoji,
        svg: cardA.entry.svg,
        attempts: 1,
      };

      setTimeout(() => {
        setReveal(null);
        setFlyingWord(record);
      }, 1200);
      setTimeout(() => {
        setCards(cs => cs.map(c =>
          (c.id === cardA.id || c.id === cardB.id) ? { ...c, matched: true } : c
        ));
        setCompleted(prev => [...prev, record]);
        setFlyingWord(null);
        setConfettiOn(false);
        setSelected([]);
        setStatus("idle");
      }, 1700);
    } else {
      setStatus("checking");
      playFeedback("wrong");
      setTimeout(() => {
        setCards(cs => cs.map(c =>
          (c.id === (cardA && cardA.id) || c.id === cardB.id)
            ? { ...c, flipped: false } : c
        ));
        setSelected([]);
        setStatus("idle");
      }, 900);
    }
  };

  const restartSession = () => {
    setSelected([]);
    setCompleted([]);
    setStatus("idle");
    setReveal(null);
    setFlyingWord(null);
    setConfettiOn(false);
    setSessionSeed(s => s + 1);
  };

  if (sessionDone) {
    return <MemorySessionComplete
      completed={completed}
      onPlayAgain={restartSession}
      onBack={onBack}
    />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>

      <ScreenHeader title="Memoria" onBack={onBack}/>

      {/* Tablero — mismo recuadro discontinuo que el banco visual de los
          otros juegos, para coherencia. */}
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
          {cards.map(card => {
            const open = card.flipped || card.matched;
            const matched = card.matched;
            const interactive = status === "idle" && !open;
            return (
              <button
                key={card.id}
                onClick={() => handleClick(card)}
                disabled={!interactive && !open}
                aria-label={open ? card.entry.word : "Carta boca abajo"}
                style={{
                  aspectRatio: "1 / 1",
                  background: matched
                    ? "var(--ok-soft)"
                    : open
                      ? "var(--surface)"
                      : "var(--accent)",
                  border: `3px solid ${matched ? "var(--ok)" : "var(--ink)"}`,
                  borderRadius: "var(--r-md)",
                  // Solo la carta abierta (volteada o emparejada) se hunde;
                  // las cartas boca abajo conservan su shadow aunque el status
                  // global no sea "idle" (checking/celebrating).
                  boxShadow: open ? "0 2px 0 var(--ink)" : "0 4px 0 var(--ink)",
                  display: "grid",
                  placeItems: "center",
                  cursor: interactive ? "pointer" : "default",
                  transition: "transform 120ms ease, box-shadow 120ms ease, background 240ms ease, border-color 240ms ease",
                }}
                onPointerDown={e => {
                  if (!interactive) return;
                  e.currentTarget.style.transform = "translateY(3px)";
                  e.currentTarget.style.boxShadow = "0 1px 0 var(--ink)";
                }}
                onPointerUp={e => {
                  if (!interactive) return;
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
                }}
                onPointerLeave={e => {
                  if (!interactive) return;
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
                }}
                onPointerCancel={e => {
                  if (!interactive) return;
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.boxShadow = "0 4px 0 var(--ink)";
                }}
              >
                {open ? (
                  <WordImage entry={card.entry} size={64}/>
                ) : (
                  <CardBack/>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pista textual debajo del tablero */}
      <div style={{
        textAlign: "center",
        marginTop: "var(--space-3)",
        color: "var(--ink-soft)",
        fontSize: "calc(13px * var(--scale))",
        fontWeight: 600,
        minHeight: 20,
      }}>
        {status === "celebrating"
          ? "¡Pareja! 🎉"
          : status === "checking"
            ? "No, prueba otra vez"
            : selected.length === 1
              ? "Busca su pareja"
              : "Toca una carta"}
      </div>

      {/* Refuerzo central al acertar pareja: la palabra grande + dibujo */}
      {reveal && <MatchReveal entry={reveal}/>}

      <Confetti active={confettiOn}/>
      {completed.length > 0 && <CompletedList items={completed} total={MEM_PAIRS}/>}
      {flyingWord && <FlyingChip word={flyingWord}/>}
    </div>
  );
}

// Reverso decorativo de la carta — círculo concéntrico simple para
// que no sea solo color plano y reconozca la "carta cerrada" de un
// vistazo.
function CardBack() {
  return (
    <svg viewBox="0 0 100 100" width="56%" height="56%" aria-hidden>
      <circle cx="50" cy="50" r="32" fill="none"
        stroke="var(--ink)" strokeWidth="3" opacity="0.55"/>
      <circle cx="50" cy="50" r="18" fill="var(--ink)" opacity="0.18"/>
      <path d="M 50 28 L 54 44 L 70 44 L 57 54 L 62 70 L 50 60 L 38 70 L 43 54 L 30 44 L 46 44 Z"
        fill="var(--ink)" opacity="0.25"/>
    </svg>
  );
}

// Overlay central que se muestra ~1.2s tras un match: dibujo grande
// + palabra silabeada. Refuerza la asociación palabra/imagen antes
// de que la pareja vuele a la lista de acertadas.
function MatchReveal({ entry }) {
  const _vlen = entry.word.length + Math.max(0, entry.syllables.length - 1);
  const fontPx = _vlen <= 9 ? 36 : _vlen <= 12 ? 30 : 26;
  return (
    <div
      aria-hidden
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 70,
        pointerEvents: "none",
        animation: "chip-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}>
      <div style={{
        background: "var(--surface)",
        border: "3px solid var(--ok)",
        borderRadius: "var(--r-xl)",
        boxShadow: "0 6px 0 var(--ok)",
        padding: "var(--space-4) var(--space-5)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        maxWidth: "min(90vw, 460px)",
      }}>
        <WordImage entry={entry} size={72} scale={false}/>
        <span style={{
          fontFamily: "Andika, Fredoka, sans-serif",
          fontWeight: 700,
          fontSize: `calc(${fontPx}px * var(--scale))`,
          letterSpacing: "0.03em",
          color: "var(--ink)",
          lineHeight: 1.1,
        }}>
          {entry.syllables.map((s, i) => (
            <React.Fragment key={i}>
              <span>{s}</span>
              {i < entry.syllables.length - 1 && (
                <span aria-hidden style={{
                  color: "var(--ink-faint)", fontWeight: 500,
                  margin: "0 0.05em",
                }}>·</span>
              )}
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
}

// Pantalla fin de sesión de "Memoria" — sin métrica de intentos
// (en este juego cada acierto es por definición a la primera), pero
// mantiene el check verde junto a cada palabra como refuerzo positivo.
function MemorySessionComplete({ completed, onPlayAgain, onBack }) {
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
        }}>¡Encontraste todas las parejas!</div>
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

window.Memory = Memory;

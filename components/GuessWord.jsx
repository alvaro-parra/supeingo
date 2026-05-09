// "Adivina la palabra" — primer juego de producción del vocabulario.
//
// El niño NO ve la imagen. Tiene huecos vacíos (= número de sílabas
// de la palabra), un banco con sílabas correctas + distractoras
// barajadas, y va recibiendo pistas progresivas a cada fallo.
//
// Cada fallo aporta dos ayudas en paralelo:
//   1. Desbloquea la siguiente pista (categoría → color → más grande
//      que → más pequeño que → primera sílaba auto-colocada → silueta
//      difuminada). De los comparadores de tamaño se elige UNO al
//      azar (por palabra), no se enseñan todos.
//   2. Elimina una sílaba distractora del banco, hasta que solo
//      quedan las correctas. En ese punto el niño no puede fallar
//      en cuanto a contenido, solo en orden — y sigue intentando
//      hasta acertar. El juego siempre termina en éxito.
//
// Reusa funciones globales definidas en otros archivos JSX:
//   - SyllableTile, ActionButton (WordBuilder.jsx)
//   - WordImage, ScreenHeader, Confetti (shared.jsx)
//   - playFeedback, CompletedList, FlyingChip, Trophy, CompletedChip
//     (WordBuilder.jsx)
//   - speak, whenTTSReady (shared.jsx)

const GW_SESSION_SIZE = 5;
const GW_POOL_SIZE = 9;
const GW_MAX_HINTS = 6;

function _gwShuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function _gwBuildSession(allWords) {
  const shuffled = _gwShuffle(allWords);
  if (shuffled.length >= GW_SESSION_SIZE) return shuffled.slice(0, GW_SESSION_SIZE);
  // Pool más pequeño que la sesión: la sesión es el pool entero (no
  // repetimos para que cada palabra se intente una sola vez).
  return shuffled;
}

function _gwBuildBank(target, allWords) {
  // Banco de sílabas: correctas + distractoras al azar de OTRAS
  // palabras del diccionario hasta llegar a GW_POOL_SIZE. No usamos
  // `decoys` curados (este juego no los pide).
  const correct = target.syllables || [];
  const fixedSet = new Set(correct);
  const dictWords = window.SUPEINGO_CONTENT.dictionary || [];
  const others = dictWords
    .filter(w => w.word !== target.word)
    .flatMap(w => w.syllables || [])
    .filter(s => !fixedSet.has(s));
  const distractors = [];
  const seen = new Set(fixedSet);
  for (const s of _gwShuffle(others)) {
    if (correct.length + distractors.length >= GW_POOL_SIZE) break;
    if (!seen.has(s)) { distractors.push(s); seen.add(s); }
  }
  // Marcamos qué sílabas son correctas para poder eliminar solo
  // distractoras al fallar.
  const all = [
    ...correct.map((s, i) => ({ id: `c-${i}-${s}`, syllable: s, correct: true })),
    ...distractors.map((s, i) => ({ id: `d-${i}-${s}`, syllable: s, correct: false })),
  ];
  // Mezcla final para que las correctas no salgan agrupadas.
  return _gwShuffle(all);
}

function GuessWord({ onBack }) {
  const allEntries = window.SUPEINGO_CONTENT.guessWords || [];

  const [sessionSeed, setSessionSeed] = useState(0);
  const session = useMemo(() => _gwBuildSession(allEntries),
    // eslint-disable-next-line
    [sessionSeed]);

  const [idx, setIdx] = useState(0);
  const sessionDone = idx >= session.length;
  const target = session[idx] || { word: "", syllables: [], emoji: "", svg: null, category: "" };

  // Banco de sílabas para la palabra actual.
  const initialBank = useMemo(() => _gwBuildBank(target, allEntries),
    // eslint-disable-next-line
    [target.word, sessionSeed]);

  // Comparadores de tamaño elegidos al azar UNA vez por palabra.
  // De `sizeSmaller` (palabras más pequeñas que el target) escogemos
  // una; de `sizeLarger` otra. Si el array está vacío o ausente,
  // la pista correspondiente se salta.
  const sizeComparators = useMemo(() => {
    const pickOne = (arr) => (arr && arr.length > 0)
      ? arr[Math.floor(Math.random() * arr.length)]
      : null;
    return {
      smaller: pickOne(target.sizeSmaller),
      larger:  pickOne(target.sizeLarger),
    };
    // eslint-disable-next-line
  }, [target.word, sessionSeed]);

  // Cuántas pistas reales se pueden mostrar para esta palabra. Algunas
  // se saltan según los datos disponibles (sin color → -1, sin
  // sizeSmaller → -1, sin sizeLarger → -1). Las pistas 1, 5 y 6
  // (categoría, primera sílaba, silueta) siempre aplican. Es lo que
  // usamos para decidir cuándo empezar a purgar distractoras: solo
  // tras agotar TODAS las pistas que esta palabra puede dar.
  const availableHints = useMemo(() => {
    let count = 3; // categoría + primera sílaba + silueta
    if (target.color)              count++;
    if (sizeComparators.smaller)   count++;
    if (sizeComparators.larger)    count++;
    return count;
    // eslint-disable-next-line
  }, [target.word, sessionSeed]);

  // IDs de sílabas eliminadas del banco (distractoras "purgadas" + la
  // primera sílaba si la pista de "primera sílaba" está activa).
  const [removedIds, setRemovedIds] = useState(new Set());
  // IDs en proceso de eliminación (animación fade-out 350ms antes de
  // pasar a removedIds definitivamente).
  const [fadingIds, setFadingIds] = useState(new Set());

  // Sílabas colocadas por el niño (lista de IDs).
  const [placed, setPlaced] = useState([]);
  // Cuando la pista 5 (primera sílaba) está activa, esta es la id del
  // tile colocado en el slot 0. Mientras esté seteada, el slot 0 es
  // verde y NO clickable, y la sílaba en el banco aparece como
  // colocada y tampoco es clickable.
  const [pinnedFirstId, setPinnedFirstId] = useState(null);

  // 0..GW_MAX_HINTS — cuántas pistas se han desbloqueado para esta palabra.
  const [hintsUsed, setHintsUsed] = useState(0);

  const [status, setStatus] = useState("idle"); // idle | correct | wrong | flying
  const [confettiOn, setConfettiOn] = useState(false);
  const [flyingWord, setFlyingWord] = useState(null);

  // Histórico de palabras acertadas (para CompletedList y SessionComplete).
  const [completed, setCompleted] = useState([]);

  // Reset al cambiar de palabra
  useEffect(() => {
    setRemovedIds(new Set());
    setFadingIds(new Set());
    setPlaced([]);
    setPinnedFirstId(null);
    setHintsUsed(0);
    setStatus("idle");
  }, [target.word, sessionSeed]);

  const visibleBank = initialBank.filter(p => !removedIds.has(p.id));

  const placedSyllables = placed
    .map(id => initialBank.find(p => p.id === id)?.syllable)
    .filter(Boolean);
  const slotsTotal = target.syllables.length;
  const isComplete = placedSyllables.length === slotsTotal;

  // Aplicar siguiente pista — desbloquea según `level` (1..6) y devuelve
  // el siguiente valor de hintsUsed (puede saltar pistas que no apliquen).
  // Niveles:
  //   1 = categoría
  //   2 = color
  //   3 = más grande que <X>  (sizeSmaller)
  //   4 = más pequeño que <Y> (sizeLarger)
  //   5 = primera sílaba — se coloca automáticamente en el slot 0
  //       (pero el niño puede quitarla si quiere; no está anclada)
  //   6 = silueta difuminada
  const applyHint = (level) => {
    if (level > GW_MAX_HINTS) return GW_MAX_HINTS;
    if (level === 2 && !target.color)            return applyHint(3);
    if (level === 3 && !sizeComparators.smaller) return applyHint(4);
    if (level === 4 && !sizeComparators.larger)  return applyHint(5);
    if (level === 5) {
      // Marcamos la primera sílaba correcta como "pinned": el slot 0
      // del AnswerArea la mostrará en verde y bloqueada. La colocación
      // efectiva en `placed` la hace el flujo del fallo (setTimeout)
      // para evitar carreras con el setPlaced([]) de limpieza.
      const firstSyl = target.syllables[0];
      const tile = initialBank.find(p =>
        p.correct && p.syllable === firstSyl && !removedIds.has(p.id)
      );
      if (tile) setPinnedFirstId(tile.id);
    }
    return level;
  };

  // Eliminar una distractora aleatoria con animación fade-out.
  const purgeOneDistractor = () => {
    const candidates = initialBank.filter(p =>
      !p.correct && !removedIds.has(p.id) && !fadingIds.has(p.id)
    );
    if (candidates.length === 0) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    setFadingIds(prev => new Set(prev).add(pick.id));
    // Si el niño la tenía colocada, devolverla.
    setPlaced(prev => prev.filter(id => id !== pick.id));
    setTimeout(() => {
      setRemovedIds(prev => new Set(prev).add(pick.id));
      setFadingIds(prev => {
        const next = new Set(prev);
        next.delete(pick.id);
        return next;
      });
    }, 350);
  };

  const handlePick = (id) => {
    if (status !== "idle") return;
    if (removedIds.has(id) || fadingIds.has(id)) return;
    // La sílaba auto-colocada por la pista 5 NO es elegible: ni se puede
    // quitar del slot 0 ni reseleccionar desde el banco.
    if (pinnedFirstId === id) return;
    if (placed.includes(id)) {
      setPlaced(placed.filter(x => x !== id));
    } else if (placedSyllables.length < slotsTotal) {
      setPlaced([...placed, id]);
    }
  };

  // Quitar una sílaba colocada al pulsar en su hueco. El slot 0 es
  // intocable cuando la sílaba pinned está colocada.
  const handleSlotClick = (slotIdx) => {
    if (status !== "idle") return;
    if (pinnedFirstId !== null && placed[slotIdx] === pinnedFirstId) return;
    if (placed[slotIdx] !== undefined) {
      setPlaced(placed.filter((_, i) => i !== slotIdx));
    }
  };

  const handleCheck = () => {
    if (status !== "idle" || !isComplete) return;
    const ok = placedSyllables.join("") === target.syllables.join("");
    if (ok) {
      playFeedback("correct");
      setStatus("correct");
      setConfettiOn(true);
      setTimeout(() => speak(target.word), 250);

      const wordRecord = {
        word: target.word,
        syllables: target.syllables,
        emoji: target.emoji,
        svg: target.svg,
        // Métrica del juego: pistas usadas, no intentos. 0-3 hints
        // (las "blandas": cat/tamaño/color) mapean a `attempts:1` para
        // reusar el badge "perfect" del CompletedChip; 4+ hints (ya
        // se reveló primera sílaba o silueta) van como `attempts:hintsUsed`.
        attempts: hintsUsed <= 3 ? 1 : hintsUsed,
        hintsUsed,
      };

      setTimeout(() => {
        setFlyingWord(wordRecord);
        setStatus("flying");
      }, 950);
      setTimeout(() => {
        setCompleted(c => [...c, wordRecord]);
        setFlyingWord(null);
        setConfettiOn(false);
        setIdx(i => i + 1);
        setStatus("idle");
      }, 1500);
    } else {
      playFeedback("wrong");
      setStatus("wrong");
      // Tras el feedback rojo, todo el flujo de transición a idle ocurre
      // a la vez (900ms) para evitar carreras de setState entre el
      // setPlaced de limpieza y la posible auto-colocación de la pista 5.
      setTimeout(() => {
        let appliedLevel = hintsUsed;
        if (hintsUsed < availableHints) {
          appliedLevel = applyHint(hintsUsed + 1);
          setHintsUsed(appliedLevel);
        } else {
          purgeOneDistractor();
        }
        // Limpieza de placed:
        //  - Si la pista que acabamos de aplicar es la 5 (o la 5 ya
        //    estaba activa), conservar la sílaba pinned en el slot 0.
        //  - En cualquier otro caso, vaciar todo.
        if (appliedLevel >= 5) {
          // Releemos pinnedFirstId vía setter funcional para evitar
          // staleness: se resuelve al render siguiente con el valor real.
          setPlaced(() => {
            const firstSyl = target.syllables[0];
            const tile = initialBank.find(p =>
              p.correct && p.syllable === firstSyl && !removedIds.has(p.id)
            );
            return tile ? [tile.id] : [];
          });
        } else {
          setPlaced([]);
        }
        setStatus("idle");
      }, 900);
    }
  };

  const handleClear = () => {
    if (status !== "idle") return;
    // La sílaba pinned (pista 5) no es borrable: la conservamos en el slot 0.
    setPlaced(pinnedFirstId !== null ? [pinnedFirstId] : []);
  };

  const restartSession = () => {
    setCompleted([]);
    setIdx(0);
    setSessionSeed(s => s + 1);
  };

  if (sessionDone) {
    return <GuessWordSessionComplete
      completed={completed}
      onPlayAgain={restartSession}
      onBack={onBack}
    />;
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-6)" }}>
      <div className="bg-decor"/>

      <ScreenHeader title="Adivina la palabra" onBack={onBack}/>

      {/* Card de respuesta: huecos N (= número de sílabas) desde el
          inicio. La pista 0, siempre visible. */}
      <AnswerWithSlots
        slotsTotal={slotsTotal}
        placedSyllables={placedSyllables}
        placedIds={placed}
        pinnedFirstId={pinnedFirstId}
        onRemove={handleSlotClick}
        status={status}
        isCorrect={status === "correct" || status === "flying"}
        revealEntry={(status === "correct" || status === "flying") ? target : null}
      />

      {/* Pista textual de progreso */}
      <div style={{
        textAlign: "center",
        marginTop: "var(--space-3)",
        color: "var(--ink-soft)",
        fontSize: "calc(13px * var(--scale))",
        fontWeight: 600,
        minHeight: 20,
      }}>
        {status === "correct" || status === "flying"
          ? "¡Lo conseguiste! 🎉"
          : status === "wrong"
            ? "No, prueba otra vez. ¡Atento a la pista nueva!"
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
        {initialBank.filter(p => !removedIds.has(p.id)).map(p => (
          <div key={p.id} style={{
            opacity: fadingIds.has(p.id) ? 0 : 1,
            transform: fadingIds.has(p.id) ? "scale(0.6) translateY(8px)" : "none",
            transition: "opacity 320ms ease, transform 320ms ease",
          }}>
            <SyllableTile
              syllable={p.syllable}
              placed={placed.includes(p.id)}
              onClick={() => handlePick(p.id)}
              disabled={status !== "idle" || fadingIds.has(p.id)}
            />
          </div>
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
          disabled={!isComplete || status !== "idle"}
        >
          Comprobar
        </ActionButton>
      </div>

      {/* Lista de pistas reveladas */}
      <HintList target={target} hintsUsed={hintsUsed} comparators={sizeComparators}/>

      <Confetti active={confettiOn}/>
      {completed.length > 0 && <CompletedList items={completed} total={session.length}/>}
      {flyingWord && <FlyingChip word={flyingWord}/>}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// AnswerWithSlots — N huecos visibles desde el inicio. La pista 0
// (número de sílabas) está implícita en cuántos huecos se ven.
// Reusa el look del AnswerArea de WordBuilder.
// Si `pinnedFirstId` está seteado y coincide con el id colocado en
// el slot 0, ese slot se pinta verde y queda no clickable.
// ──────────────────────────────────────────────────────────────
function AnswerWithSlots({ slotsTotal, placedSyllables, placedIds, pinnedFirstId, onRemove, status, isCorrect, revealEntry }) {
  const borderColor = isCorrect ? "var(--ok)"
    : status === "wrong" ? "var(--accent-strong)"
    : "var(--ink-faint)";
  const solid = isCorrect || status === "wrong";
  const bg = isCorrect ? "var(--ok-soft)" : "var(--surface)";

  // Auto-shrink ligero igual que en AnswerArea de WordBuilder.
  const totalChars = (placedSyllables || []).reduce((n, s) => n + (s ? s.length : 0), 0)
    + Math.max(0, slotsTotal - 1);
  const fontPx = totalChars > 14 ? 22 : totalChars > 11 ? 25 : 28;

  return (
    <div style={{
      margin: "var(--space-3) var(--space-4) 0",
      padding: "var(--space-3)",
      background: bg,
      border: `3px ${solid ? "solid" : "dashed"} ${borderColor}`,
      borderRadius: "var(--r-md)",
      minHeight: 76,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: "var(--space-3)",
      position: "relative",
      zIndex: 2,
      animation: status === "wrong" ? "shake 360ms ease-in-out" : "none",
      transition: "border-color 200ms ease, background 200ms ease",
    }}>
      {/* Si acertó, mostramos la imagen revelada al lado de la palabra */}
      {revealEntry && (
        <div style={{
          flexShrink: 0,
          animation: "chip-in 360ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}>
          <WordImage entry={revealEntry} size={56}/>
        </div>
      )}
      <div style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.15em",
        fontFamily: "Andika, Fredoka, sans-serif",
        fontSize: `calc(${fontPx}px * var(--scale))`,
        fontWeight: 700,
        color: "var(--ink)",
        lineHeight: 1.1,
      }}>
        {Array.from({ length: slotsTotal }).map((_, i) => {
          const syl = placedSyllables[i];
          const slotId = placedIds && placedIds[i];
          const fixed = pinnedFirstId !== null && slotId === pinnedFirstId;
          return (
            <React.Fragment key={i}>
              {syl ? (
                <button
                  onClick={() => onRemove(i)}
                  disabled={fixed || status !== "idle"}
                  aria-label={fixed ? `Sílaba ${syl} (fijada)` : `Quitar ${syl}`}
                  style={{
                    background: fixed ? "var(--ok-soft)" : "transparent",
                    border: fixed ? "2px solid var(--ok)" : "2px solid transparent",
                    color: "var(--ink)",
                    padding: "2px 8px",
                    borderRadius: "var(--r-sm)",
                    cursor: fixed || status !== "idle" ? "default" : "pointer",
                    font: "inherit",
                    letterSpacing: "0.02em",
                  }}
                >
                  {syl}
                </button>
              ) : (
                <span style={{
                  display: "inline-block",
                  minWidth: "1.4em",
                  borderBottom: "3px solid var(--ink-faint)",
                  margin: "0 0.05em",
                  height: "1em",
                }}/>
              )}
              {i < slotsTotal - 1 && (
                <span aria-hidden style={{
                  color: "var(--ink-faint)", fontWeight: 500,
                  margin: "0 0.05em",
                }}>·</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// HintList — lista vertical de pistas reveladas. Crece por debajo
// del banco a medida que el niño falla.
// ──────────────────────────────────────────────────────────────
function HintList({ target, hintsUsed, comparators }) {
  if (hintsUsed === 0) return null;
  // Construimos las pistas en el orden de desbloqueo, saltando las que
  // no aplican (sin color, sin sizeSmaller, sin sizeLarger).
  // Niveles: 1=cat, 2=color, 3=más-grande-que, 4=más-pequeño-que,
  // 5=primera-sílaba (texto informativo), 6=silueta (UI directa).
  const cards = [];
  if (hintsUsed >= 1) {
    cards.push(<CategoryHint key="cat" entry={target}/>);
  }
  if (hintsUsed >= 2 && target.color) {
    cards.push(<ColorHint key="color" entry={target}/>);
  }
  if (hintsUsed >= 3 && comparators && comparators.smaller) {
    cards.push(<SizeBiggerHint key="bigger" word={comparators.smaller}/>);
  }
  if (hintsUsed >= 4 && comparators && comparators.larger) {
    cards.push(<SizeSmallerHint key="smaller" word={comparators.larger}/>);
  }
  if (hintsUsed >= 5 && target.syllables && target.syllables.length > 0) {
    // Card explicativa de la pista 5. La sílaba se autocoloca en el
    // slot 0 del AnswerArea (en verde, bloqueada); la card aquí explica
    // de dónde salió y qué representa.
    cards.push(<FirstSyllableHint key="firstsyl" syllable={target.syllables[0]}/>);
  }
  if (hintsUsed >= 6) {
    cards.push(<SilhouetteHint key="silhouette" entry={target}/>);
  }
  if (cards.length === 0) return null;
  // Invertimos para que la pista más reciente quede arriba — así no
  // hay que hacer scroll cuando se desbloquea una nueva.
  cards.reverse();
  return (
    <div style={{
      margin: "var(--space-4) var(--space-4) 0",
      padding: "var(--space-3) var(--space-4)",
      background: "var(--surface)",
      border: "3px solid var(--ink)",
      borderRadius: "var(--r-lg)",
      boxShadow: "var(--shadow-md)",
      position: "relative", zIndex: 2,
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-3)",
    }}>
      <div style={{
        color: "var(--ink-soft)",
        fontSize: "calc(12px * var(--scale))",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
      }}>Pistas</div>
      {cards}
    </div>
  );
}

function CategoryHint({ entry }) {
  const icon  = (window.SUPEINGO_CONTENT.guessCategoryIcons  || {})[entry.category] || "❓";
  const label = (window.SUPEINGO_CONTENT.guessCategoryLabels || {})[entry.category] || `Categoría: ${entry.category}`;
  return (
    <HintCard>
      <span aria-hidden style={{ fontSize: "calc(28px * var(--scale))", lineHeight: 1 }}>{icon}</span>
      <span style={{ fontSize: "calc(17px * var(--scale))", fontWeight: 600 }}>{label}</span>
    </HintCard>
  );
}

// Pista "más grande que <X>" — un solo comparador, escogido al azar
// en el componente padre (sizeComparators.smaller).
function SizeBiggerHint({ word }) {
  const dict = window.SUPEINGO_CONTENT.dictionaryByWord || {};
  const ref = dict[word];
  if (!ref) return null;
  return (
    <HintCard>
      <span style={{ fontSize: "calc(17px * var(--scale))", fontWeight: 600 }}>Más grande que</span>
      <ChipMini entry={ref}/>
    </HintCard>
  );
}

// Pista "más pequeño que <Y>" — un solo comparador.
function SizeSmallerHint({ word }) {
  const dict = window.SUPEINGO_CONTENT.dictionaryByWord || {};
  const ref = dict[word];
  if (!ref) return null;
  return (
    <HintCard>
      <span style={{ fontSize: "calc(17px * var(--scale))", fontWeight: 600 }}>Más pequeño que</span>
      <ChipMini entry={ref}/>
    </HintCard>
  );
}

// Pista "Tiene esta forma" — silueta negra del referente. Va dentro
// del HintList (no encima del AnswerArea) para que el banco no se
// desplace al desbloquearla.
function SilhouetteHint({ entry }) {
  return (
    <HintCard>
      {/* brightness(0) mapea todos los píxeles opacos a negro,
          dejando los transparentes intactos. Sirve tanto para
          emojis como para SVGs propios. */}
      <span aria-hidden style={{
        display: "inline-grid",
        placeItems: "center",
        width: 56, height: 56,
        background: "var(--surface)",
        border: "2px solid var(--ink-faint)",
        borderRadius: "var(--r-sm)",
        flexShrink: 0,
      }}>
        <span style={{ filter: "brightness(0)", opacity: 0.9, lineHeight: 0 }}>
          <WordImage entry={entry} size={40}/>
        </span>
      </span>
      <span style={{ fontSize: "calc(17px * var(--scale))", fontWeight: 600 }}>Tiene esta forma</span>
    </HintCard>
  );
}

// Pista "Empieza por <S>" — explica que la sílaba se ha colocado
// automáticamente en el AnswerArea. El niño puede quitarla si quiere.
function FirstSyllableHint({ syllable }) {
  return (
    <HintCard>
      <span style={{ fontSize: "calc(17px * var(--scale))", fontWeight: 600 }}>Empieza por</span>
      <span style={{
        fontFamily: "Andika, Fredoka, sans-serif",
        fontSize: "calc(20px * var(--scale))",
        fontWeight: 700,
        background: "var(--surface)",
        border: "2px solid var(--ink)",
        borderRadius: "var(--r-sm)",
        padding: "2px 10px",
        letterSpacing: "0.02em",
      }}>{syllable}</span>
    </HintCard>
  );
}

function ColorHint({ entry }) {
  const hex = (window.SUPEINGO_CONTENT.guessColorHex || {})[entry.color] || "#777";
  return (
    <HintCard>
      <span aria-hidden style={{
        width: 28, height: 28,
        background: hex,
        border: "3px solid var(--ink)",
        borderRadius: "50%",
        flexShrink: 0,
      }}/>
      <span style={{ fontSize: "calc(17px * var(--scale))", fontWeight: 600 }}>Es {entry.color}</span>
    </HintCard>
  );
}

function HintCard({ children, column = false }) {
  return (
    <div style={{
      background: "var(--bg-2)",
      border: "2px solid var(--ink-faint)",
      borderRadius: "var(--r-md)",
      padding: "var(--space-2) var(--space-3)",
      display: "flex",
      flexDirection: column ? "column" : "row",
      alignItems: column ? "flex-start" : "center",
      gap: column ? 6 : 12,
      animation: "chip-in 320ms cubic-bezier(0.34, 1.56, 0.64, 1)",
    }}>
      {children}
    </div>
  );
}

function ChipMini({ entry }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      background: "var(--surface)",
      border: "2px solid var(--ink)",
      borderRadius: 999,
      padding: "2px 10px 2px 6px",
      fontSize: "calc(14px * var(--scale))",
      fontWeight: 700,
    }}>
      <WordImage entry={entry} size={22} scale={false}/>
      {entry.word}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────
// Pantalla fin de sesión — clon de MemorySessionComplete.
// El badge per-chip aparece como "perfect" cuando hintsUsed <= 3,
// gracias al truco en el record (attempts: 1 si pocas pistas).
// ──────────────────────────────────────────────────────────────
function GuessWordSessionComplete({ completed, onPlayAgain, onBack }) {
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
        }}>¡Adivinaste {completed.length} {completed.length === 1 ? "palabra" : "palabras"}!</div>
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
              item={it}
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

window.GuessWord = GuessWord;

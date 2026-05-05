// Área de Aprendizaje — submenú con secciones (Letras, Sílabas, Vocabulario)
// y cada sección con su propia vista.

function LearnArea({ onBack }) {
  const [section, setSection] = useState(null); // null = menú | "letters" | "syllables"

  if (section === null) {
    return <LearnMenu onBack={onBack} onPick={setSection}/>;
  }
  if (section === "letters") {
    return <LettersScreen onBack={() => setSection(null)}/>;
  }
  if (section === "syllables") {
    return <SyllablesScreen onBack={() => setSection(null)}/>;
  }
  return null;
}

// ────────────────────────────────────────────────────────────
// Submenú de Aprender
// ────────────────────────────────────────────────────────────
function LearnMenu({ onBack, onPick }) {
  const sections = [
    { id: "letters",   name: "Letras",      subtitle: "El abecedario", color: "secondary", emoji: "🔤", ready: true },
    { id: "syllables", name: "Sílabas básicas", subtitle: "BA · BE · BI…", color: "accent", emoji: "🧱", ready: false },
    { id: "vocab",     name: "Vocabulario", subtitle: "Animales, comida…", color: "warn", emoji: "📚", ready: false },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-7)" }}>
      <div className="bg-decor"/>
      <ScreenHeader title="Aprender" onBack={onBack}/>

      <div style={{ padding: "0 var(--space-5) var(--space-4)", position: "relative", zIndex: 2 }}>
        <MascotHint size={56} mood="happy">
          ¿Qué quieres ver?
        </MascotHint>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-4) 0",
        position: "relative", zIndex: 2,
      }}>
        {sections.map(s => (
          <SectionCard key={s.id} {...s} onClick={() => s.ready && onPick(s.id)}/>
        ))}
      </div>
    </div>
  );
}

function SectionCard({ name, subtitle, color, emoji, ready, onClick }) {
  const bg = color === "accent" ? "var(--accent)"
    : color === "secondary" ? "var(--secondary)"
    : color === "warn" ? "var(--warn)"
    : "var(--ok)";

  return (
    <button onClick={onClick} disabled={!ready}
      style={{
        background: ready ? bg : "var(--bg-2)",
        opacity: ready ? 1 : 0.55,
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-lg)",
        boxShadow: ready ? "0 5px 0 var(--ink)" : "0 2px 0 var(--ink)",
        padding: "var(--space-4)",
        textAlign: "left",
        minHeight: 140,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        position: "relative",
      }}
    >
      <div style={{
        width: 56, height: 56,
        borderRadius: "var(--r-md)",
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        display: "grid", placeItems: "center",
        fontSize: 30,
      }}>{emoji}</div>
      <div>
        <div style={{ fontSize: "calc(18px * var(--scale))", fontWeight: 700, lineHeight: 1.1 }}>{name}</div>
        <div style={{ fontSize: "calc(13px * var(--scale))", opacity: 0.75, marginTop: 2, fontWeight: 500 }}>{subtitle}</div>
      </div>
      {!ready && (
        <span style={{
          position: "absolute", top: 12, right: 12,
          background: "var(--ink)", color: "var(--bg)",
          padding: "3px 10px", borderRadius: 999,
          fontSize: "calc(11px * var(--scale))",
          fontWeight: 700, letterSpacing: "0.05em",
        }}>PRONTO</span>
      )}
    </button>
  );
}

// Devuelve cómo se debe pronunciar el NOMBRE de la letra. Si el dato la
// trae como `spell` lo usamos (Y → "i griega", CH → "che"), si no la
// versión en mayúscula es lo que dice el TTS por defecto.
function letterSpell(letter) {
  return letter.spell || letter.upper;
}

// ────────────────────────────────────────────────────────────
// LETRAS (lo que antes era LearnArea)
// ────────────────────────────────────────────────────────────
function LettersScreen({ onBack }) {
  const allLetters = window.SUPEINGO_CONTENT.alphabet;
  const teaching = window.SUPEINGO_TEACHING_CONFIG || {};
  // Filtrar dígrafos (CH, LL) según preferencia.
  const alphabet = teaching.includeDigraphs === false
    ? allLetters.filter(l => !l.digraph)
    : allLetters;
  const [selected, setSelected] = useState(null);
  const [showCase, setShowCase] = useState("upper");

  const handleTap = (letter) => {
    setSelected(letter);
    // "a, de abeja" — refuerza la asociación letra↔ejemplo en una sola escucha.
    speak(`${letterSpell(letter)}, de ${letter.word}`);
  };

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-7)" }}>
      <div className="bg-decor"/>
      <ScreenHeader title="El abecedario" onBack={onBack}/>

      <div style={{ padding: "0 var(--space-5) var(--space-4)", position: "relative", zIndex: 2 }}>
        <MascotHint size={56} mood="happy">
          Pulsa una letra para escucharla
        </MascotHint>
      </div>

      <div style={{
        display: "flex", justifyContent: "center",
        gap: 0, padding: "0 var(--space-5) var(--space-4)",
        position: "relative", zIndex: 2,
      }}>
        <CaseToggle value={showCase} onChange={setShowCase}/>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "var(--space-2)",
        padding: "0 var(--space-4)",
        position: "relative", zIndex: 2,
      }}>
        {alphabet.map((l, i) => (
          <LetterTile
            key={l.upper}
            letter={showCase === "upper" ? l.upper : l.lower}
            active={selected?.upper === l.upper}
            color={i % 3 === 0 ? "accent" : i % 3 === 1 ? "secondary" : "warn"}
            onClick={() => handleTap(l)}
          />
        ))}
      </div>

      {selected && (
        <ExamplePanel letter={selected} showCase={showCase} onClose={() => setSelected(null)}/>
      )}
    </div>
  );
}

function CaseToggle({ value, onChange }) {
  return (
    <div style={{
      display: "inline-flex",
      background: "var(--surface)",
      border: "3px solid var(--ink)",
      borderRadius: 999,
      boxShadow: "0 3px 0 var(--ink)",
      padding: 4,
    }}>
      {[
        { id: "upper", label: "A B C" },
        { id: "lower", label: "a b c" },
      ].map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          style={{
            padding: "10px 18px",
            borderRadius: 999,
            background: value === opt.id ? "var(--accent)" : "transparent",
            color: "var(--ink)",
            fontWeight: 700,
            fontSize: "calc(15px * var(--scale))",
            fontFamily: "Andika, Fredoka, sans-serif",
            transition: "background 180ms ease",
          }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function LetterTile({ letter, color, active, onClick }) {
  const colorMap = {
    accent: { bg: "var(--accent)" },
    secondary: { bg: "var(--secondary)" },
    warn: { bg: "var(--warn)" },
  };
  const c = colorMap[color];
  return (
    <button onClick={onClick} aria-label={`Letra ${letter}`}
      style={{
        aspectRatio: "1 / 1",
        background: c.bg,
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-md)",
        boxShadow: active ? "0 1px 0 var(--ink)" : "0 4px 0 var(--ink)",
        transform: active ? "translateY(3px)" : "none",
        fontSize: "calc(30px * var(--scale))",
        fontWeight: 700,
        fontFamily: "Andika, Fredoka, sans-serif",
        color: "var(--ink)",
        // Centrar y dejar margen para descenders (g, j, p, q, y)
        display: "grid",
        placeItems: "center",
        lineHeight: 1.1,
        overflow: "hidden",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}>
      {letter}
    </button>
  );
}

function ExamplePanel({ letter, showCase, onClose }) {
  // El audio "Letra A, de abeja" ya se dispara desde handleTap al abrir el
  // panel — no repetimos aquí para evitar solapamientos. El usuario puede
  // volver a oírlo pulsando el altavoz.
  return (
    <div style={{
      position: "fixed", left: 0, right: 0, bottom: 0,
      maxWidth: 480, margin: "0 auto",
      background: "var(--surface)",
      border: "3px solid var(--ink)",
      borderBottom: "none",
      borderTopLeftRadius: "var(--r-xl)",
      borderTopRightRadius: "var(--r-xl)",
      boxShadow: "0 -8px 24px -8px rgba(42,42,51,0.2)",
      padding: "var(--space-5)",
      zIndex: 30,
      animation: "pop 220ms ease-out",
    }}>
      <button onClick={onClose} aria-label="Cerrar"
        style={{
          position: "absolute", top: 12, right: 12,
          width: 36, height: 36,
          borderRadius: "50%",
          border: "2px solid var(--ink)",
          background: "var(--bg)",
          fontWeight: 700,
        }}>×</button>

      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
        <div style={{
          width: 96, height: 96,
          background: "var(--bg-2)",
          border: "3px solid var(--ink)",
          borderRadius: "var(--r-md)",
          display: "grid", placeItems: "center",
          fontSize: "calc(48px * var(--scale))",
          fontWeight: 700,
          fontFamily: "Andika, Fredoka, sans-serif",
          // lineHeight 1.1 deja espacio para el descender (g, j, p, q, y)
          // sin que sobresalga del cuadro.
          lineHeight: 1.1,
          overflow: "hidden",
          flexShrink: 0,
        }}>{showCase === "upper" ? letter.upper : letter.lower}</div>

        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span style={{ fontSize: 40 }} aria-hidden>{letter.emoji}</span>
            <SpeakButton text={`${letterSpell(letter)}, de ${letter.word}`} label="Escuchar" size={44}/>
          </div>
          <div style={{
            marginTop: "var(--space-2)",
            fontSize: "calc(22px * var(--scale))",
            fontWeight: 700,
            fontFamily: "Andika, Fredoka, sans-serif",
            letterSpacing: "0.05em",
          }}>
            {(() => {
              // Resaltar la(s) letra(s) objetivo: para dígrafos como "CH"
              // o "LL" hay que comparar de 2 en 2, no carácter a carácter.
              const target = letter.upper;
              const word = letter.word;
              const out = [];
              let i = 0;
              while (i < word.length) {
                const slice = word.slice(i, i + target.length).toUpperCase();
                const isTarget = slice === target;
                if (isTarget) {
                  out.push(
                    <span key={i} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
                      {word.slice(i, i + target.length)}
                    </span>
                  );
                  i += target.length;
                } else {
                  out.push(
                    <span key={i} style={{ color: "var(--ink)", fontWeight: 500 }}>
                      {word[i]}
                    </span>
                  );
                  i += 1;
                }
              }
              return out;
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// SÍLABAS — tabla de familias silábicas (ma me mi mo mu, etc.)
// ────────────────────────────────────────────────────────────
function SyllablesScreen({ onBack }) {
  const families = window.SUPEINGO_CONTENT.syllableFamilies;
  const [active, setActive] = useState(null); // {family, syllable}

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-7)" }}>
      <div className="bg-decor"/>
      <ScreenHeader title="Sílabas básicas" onBack={onBack}/>

      <div style={{ padding: "0 var(--space-5) var(--space-4)", position: "relative", zIndex: 2 }}>
        <MascotHint size={56} mood="happy">
          Pulsa una sílaba para oírla
        </MascotHint>
      </div>

      <div style={{
        padding: "0 var(--space-4)",
        display: "grid",
        gap: "var(--space-3)",
        position: "relative", zIndex: 2,
      }}>
        {families.map(fam => (
          <SyllableFamily key={fam.consonant} family={fam}
            activeSyllable={active?.family === fam.consonant ? active.syllable : null}
            onPick={(s) => {
              setActive({ family: fam.consonant, syllable: s.syllable });
              speak(s.spell || s.syllable, { kind: "syllable" });
            }}/>
        ))}
      </div>
    </div>
  );
}

function SyllableFamily({ family, activeSyllable, onPick }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "3px solid var(--ink)",
      borderRadius: "var(--r-lg)",
      padding: "var(--space-3)",
      boxShadow: "0 3px 0 var(--ink)",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        gap: "var(--space-3)",
        marginBottom: "var(--space-3)",
        padding: "0 var(--space-1)",
      }}>
        <div style={{
          width: 44, height: 44,
          background: "var(--bg-2)",
          border: "3px solid var(--ink)",
          borderRadius: "var(--r-sm)",
          display: "grid", placeItems: "center",
          fontWeight: 700,
          fontFamily: "Andika, Fredoka, sans-serif",
          fontSize: "calc(22px * var(--scale))",
        }}>{family.consonant}</div>
        <div style={{
          fontSize: "calc(13px * var(--scale))",
          color: "var(--ink-soft)",
          fontWeight: 600,
        }}>Familia de la <strong>{family.consonant}</strong></div>
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "var(--space-2)",
      }}>
        {family.syllables.map(s => (
          <button key={s.syllable} onClick={() => onPick(s)}
            style={{
              aspectRatio: "1.1 / 1",
              background: activeSyllable === s.syllable ? "var(--accent)" : "var(--bg-2)",
              border: "3px solid var(--ink)",
              borderRadius: "var(--r-sm)",
              boxShadow: activeSyllable === s.syllable ? "0 1px 0 var(--ink)" : "0 3px 0 var(--ink)",
              transform: activeSyllable === s.syllable ? "translateY(2px)" : "none",
              fontWeight: 700,
              fontFamily: "Andika, Fredoka, sans-serif",
              fontSize: "calc(20px * var(--scale))",
              color: "var(--ink)",
              transition: "transform 120ms ease, box-shadow 120ms ease, background 200ms ease",
            }}>
            {s.syllable}
          </button>
        ))}
      </div>
    </div>
  );
}

window.LearnArea = LearnArea;

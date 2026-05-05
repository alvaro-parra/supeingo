// Pantalla Home — punto de entrada
// Dos áreas grandes: Aprender y Jugar

function Home({ onNav, mascotOn, onSettings }) {
  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-7)" }}>
      <div className="bg-decor"/>
      <header style={{
        padding: "var(--space-5) var(--space-5) var(--space-3)",
        position: "relative",
        zIndex: 2,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "var(--space-3)",
      }}>
        <div>
          <p style={{
            margin: 0,
            color: "var(--ink-soft)",
            fontSize: "calc(14px * var(--scale))",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}>¡Hola!</p>
          <h1 style={{
            margin: "var(--space-1) 0 0",
            fontSize: "calc(34px * var(--scale))",
            fontWeight: 700,
            lineHeight: 1.05,
          }}>Vamos a aprender <span style={{ color: "var(--accent-strong)" }}>español</span></h1>
        </div>
        <button
          onClick={onSettings}
          aria-label="Ajustes"
          style={{
            width: 44, height: 44,
            background: "var(--surface)",
            border: "3px solid var(--ink)",
            borderRadius: "50%",
            boxShadow: "0 3px 0 var(--ink)",
            display: "grid", placeItems: "center",
            cursor: "pointer",
            flexShrink: 0,
            marginTop: 4,
          }}
        >
          <svg viewBox="0 0 24 24" width={22} height={22} fill="none">
            {/* Engranaje con dientes en cruz + diagonales */}
            <path
              d="M 10.5 2.5 L 13.5 2.5 L 14 5 L 16 5.8 L 18 4.4 L 20 6.4 L 18.6 8.4 L 19.4 10.4 L 22 11 L 22 14 L 19.4 14.6 L 18.6 16.6 L 20 18.6 L 18 20.6 L 16 19.2 L 14 20 L 13.4 22.5 L 10.5 22.5 L 10 20 L 8 19.2 L 6 20.6 L 4 18.6 L 5.4 16.6 L 4.6 14.6 L 2 14 L 2 11 L 4.6 10.4 L 5.4 8.4 L 4 6.4 L 6 4.4 L 8 5.8 L 10 5 Z"
              stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round" fill="var(--bg-2)"
            />
            <circle cx="12" cy="12.5" r="3.2" stroke="var(--ink)" strokeWidth="2" fill="var(--surface)"/>
          </svg>
        </button>
      </header>

      {mascotOn ? (
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-3)",
          padding: "var(--space-4) var(--space-5) var(--space-5)",
          position: "relative", zIndex: 2,
        }}>
          <Mascot size={96} mood="happy"/>
          <SpeechBubble>¿Qué quieres hacer hoy?</SpeechBubble>
        </div>
      ) : (
        <div style={{ height: "var(--space-6)" }}/>
      )}

      {/* Dos cards grandes */}
      <div style={{
        display: "grid",
        gap: "var(--space-4)",
        padding: "0 var(--space-5)",
        position: "relative",
        zIndex: 2,
      }}>
        <HomeCard
          title="Aprender"
          subtitle="Letras y sílabas"
          color="secondary"
          illustration={<LearnIllustration/>}
          onClick={() => onNav("learn")}
        />
        <HomeCard
          title="Jugar"
          subtitle="Forma palabras"
          color="accent"
          illustration={<PlayIllustration/>}
          onClick={() => onNav("play")}
        />
      </div>

    </div>
  );
}

function SpeechBubble({ children }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "3px solid var(--ink)",
      borderRadius: "var(--r-lg)",
      padding: "var(--space-3) var(--space-5)",
      boxShadow: "0 3px 0 var(--ink)",
      fontWeight: 600,
      fontSize: "calc(16px * var(--scale))",
      position: "relative",
    }}>
      {children}
      {/* Cola apuntando a la izquierda hacia el niño.
          El triángulo blanco debe solapar el borde izquierdo del globo (3px)
          para que no se vea una línea negra donde se unen. */}
      <span style={{
        position: "absolute",
        left: -13,
        top: "50%",
        transform: "translateY(-50%)",
        width: 0, height: 0,
        borderTop: "10px solid transparent",
        borderBottom: "10px solid transparent",
        borderRight: "13px solid var(--ink)",
      }}/>
      <span style={{
        position: "absolute",
        left: -7,           /* se mete 3px dentro del globo para tapar el borde */
        top: "50%",
        transform: "translateY(-50%)",
        width: 0, height: 0,
        borderTop: "7px solid transparent",
        borderBottom: "7px solid transparent",
        borderRight: "10px solid var(--surface)",
      }}/>
    </div>
  );
}

function HomeCard({ title, subtitle, color, illustration, onClick }) {
  const bg = color === "accent" ? "var(--accent)" : "var(--secondary)";
  return (
    <button onClick={onClick} style={{
      background: bg,
      color: "var(--ink)",
      border: "3px solid var(--ink)",
      borderRadius: "var(--r-xl)",
      padding: "var(--space-5)",
      boxShadow: "0 6px 0 var(--ink)",
      display: "flex",
      alignItems: "center",
      gap: "var(--space-4)",
      textAlign: "left",
      minHeight: 120,
      transition: "transform 120ms ease, box-shadow 120ms ease",
    }}
      onPointerDown={e => {
        e.currentTarget.style.transform = "translateY(4px)";
        e.currentTarget.style.boxShadow = "0 2px 0 var(--ink)";
      }}
      onPointerUp={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 0 var(--ink)";
      }}
      onPointerLeave={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 0 var(--ink)";
      }}
      onPointerCancel={e => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 0 var(--ink)";
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: "calc(28px * var(--scale))",
          fontWeight: 700,
          lineHeight: 1,
        }}>{title}</div>
        <div style={{
          marginTop: 4,
          fontSize: "calc(15px * var(--scale))",
          opacity: 0.75,
          fontWeight: 500,
        }}>{subtitle}</div>
      </div>
      <div style={{
        width: 88, height: 88,
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-lg)",
        display: "grid", placeItems: "center",
        flexShrink: 0,
      }}>{illustration}</div>
    </button>
  );
}

// Ilustración "Aprender" — letras Aa apiladas
function LearnIllustration() {
  return (
    <svg viewBox="0 0 60 60" width="64" height="64">
      <text x="14" y="34" className="letter-face"
            style={{ fontSize: 30, fontWeight: 700, fill: "var(--secondary-strong)", fontFamily: "Andika, Fredoka, sans-serif" }}>A</text>
      <text x="34" y="48" className="letter-face"
            style={{ fontSize: 26, fontWeight: 700, fill: "var(--accent-strong)", fontFamily: "Andika, Fredoka, sans-serif" }}>a</text>
    </svg>
  );
}

// Ilustración "Jugar" — bloques de sílabas
function PlayIllustration() {
  return (
    <svg viewBox="0 0 60 60" width="64" height="64">
      <rect x="6" y="20" width="22" height="22" rx="5" fill="var(--accent)" stroke="var(--ink)" strokeWidth="2"/>
      <text x="17" y="36" textAnchor="middle"
            style={{ fontSize: 12, fontWeight: 700, fill: "var(--ink)", fontFamily: "Fredoka, sans-serif" }}>GA</text>
      <rect x="32" y="20" width="22" height="22" rx="5" fill="var(--warn)" stroke="var(--ink)" strokeWidth="2"/>
      <text x="43" y="36" textAnchor="middle"
            style={{ fontSize: 12, fontWeight: 700, fill: "var(--ink)", fontFamily: "Fredoka, sans-serif" }}>TO</text>
    </svg>
  );
}

window.Home = Home;

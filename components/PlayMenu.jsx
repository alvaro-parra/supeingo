// Menú de juegos — entrada al área Jugar

function PlayMenu({ onBack, onPick }) {
  // Mismo color para todas las opciones del menú "Jugar" (rojo suave,
  // igual que la card de Jugar en Home) — facilita la lectura cuando hay
  // varios juegos seguidos.
  const games = [
    { id: "builder", name: "Forma palabras",     subtitle: "Ordena las sílabas", color: "accent", emoji: "🧩", ready: true },
    { id: "find",    name: "Busca el dibujo", subtitle: "Lee y elige",         color: "accent", emoji: "🔍", ready: true },
    { id: "memory",  name: "Memoria",        subtitle: "Empareja parejas",   color: "accent", emoji: "🃏", ready: true },
    { id: "guess",   name: "Adivina la palabra", subtitle: "Pistas y sílabas", color: "accent", emoji: "🤔", ready: true },
    { id: "fill",    name: "Rellena hueco",  subtitle: "Falta una sílaba",  color: "accent", emoji: "✏️", ready: false },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-7)" }}>
      <div className="bg-decor"/>
      <ScreenHeader title="¿A qué jugamos?" onBack={onBack}/>

      {/* Ayudante + bocadillo igual que en Home — tamaños grandes para
          que la pista se lea bien al entrar al menú. */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "var(--space-3)",
        padding: "var(--space-4) var(--space-5) var(--space-5)",
        position: "relative", zIndex: 2,
      }}>
        <Helper size={96} mood="happy"/>
        <SpeechBubble>Elige un juego para empezar</SpeechBubble>
      </div>

      {/* Un juego por fila — mismo formato que las dos cards del Home,
          para que la lectura sea coherente entre niveles. */}
      <div style={{
        display: "grid",
        gap: "var(--space-4)",
        padding: "0 var(--space-5)",
        position: "relative", zIndex: 2,
      }}>
        {games.map(g => (
          <GameCard key={g.id} {...g}
            onClick={() => g.ready && onPick(g.id)}/>
        ))}
      </div>
    </div>
  );
}

function GameCard({ name, subtitle, color, emoji, ready, onClick }) {
  const bg = color === "accent" ? "var(--accent)"
    : color === "secondary" ? "var(--secondary)"
    : color === "warn" ? "var(--warn)"
    : "var(--ok)";

  return (
    <button onClick={onClick} disabled={!ready}
      style={{
        background: ready ? bg : "var(--bg-2)",
        opacity: ready ? 1 : 0.55,
        color: "var(--ink)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-xl)",
        boxShadow: ready ? "0 6px 0 var(--ink)" : "0 2px 0 var(--ink)",
        padding: "var(--space-5)",
        textAlign: "left",
        minHeight: 120,
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        position: "relative",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onPointerDown={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(4px)";
        e.currentTarget.style.boxShadow = "0 2px 0 var(--ink)";
      }}
      onPointerUp={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 0 var(--ink)";
      }}
      onPointerLeave={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 0 var(--ink)";
      }}
      onPointerCancel={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 6px 0 var(--ink)";
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: "calc(28px * var(--scale))",
          fontWeight: 700,
          lineHeight: 1,
        }}>{name}</div>
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
        fontSize: 44,
      }}>{emoji}</div>
      {!ready && (
        <span style={{
          position: "absolute", top: 12, right: 12,
          background: "var(--ink)", color: "var(--bg)",
          padding: "3px 10px",
          borderRadius: 999,
          fontSize: "calc(11px * var(--scale))",
          fontWeight: 700,
          letterSpacing: "0.05em",
        }}>PRONTO</span>
      )}
    </button>
  );
}

window.PlayMenu = PlayMenu;

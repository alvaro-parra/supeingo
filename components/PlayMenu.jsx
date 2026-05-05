// Menú de juegos — entrada al área Jugar

function PlayMenu({ onBack, onPick }) {
  const games = [
    { id: "builder", name: "Forma palabras", subtitle: "Ordena las sílabas", color: "accent", emoji: "🧩", ready: true },
    { id: "memory",  name: "Memoria",        subtitle: "Empareja parejas",   color: "secondary", emoji: "🃏", ready: false },
    { id: "match",   name: "Emparejar",      subtitle: "Imagen y palabra",   color: "warn", emoji: "🔗", ready: false },
    { id: "fill",    name: "Rellena hueco",  subtitle: "Falta una sílaba",  color: "ok", emoji: "✏️", ready: false },
  ];

  return (
    <div style={{ position: "relative", minHeight: "100vh", paddingBottom: "var(--space-7)" }}>
      <div className="bg-decor"/>
      <ScreenHeader title="¿A qué jugamos?" onBack={onBack}/>

      <div style={{ padding: "0 var(--space-5) var(--space-4)", position: "relative", zIndex: 2 }}>
        <MascotHint size={56} mood="happy">
          Elige un juego para empezar
        </MascotHint>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "var(--space-3)",
        padding: "var(--space-2) var(--space-4) 0",
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
        transition: "transform 120ms ease, box-shadow 120ms ease",
      }}
      onPointerDown={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(3px)";
        e.currentTarget.style.boxShadow = "0 2px 0 var(--ink)";
      }}
      onPointerUp={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
      }}
      onPointerLeave={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
      }}
      onPointerCancel={e => {
        if (!ready) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
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

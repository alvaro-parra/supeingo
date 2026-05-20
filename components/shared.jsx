// Componentes compartidos de Supeingo
// Ayudante, indicadores de audio, confeti, estrellas, etc.

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ------------------------------------------------------------
// Web Speech helper — busca la mejor voz en español disponible
// ------------------------------------------------------------
let _bestVoice = null;
function _pickBestSpanishVoice() {
  if (_bestVoice) return _bestVoice;
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  // Prioridad: voces de alta calidad en es-ES, luego es-MX, luego cualquier es-*
  const prefer = [
    /Mónica/i, /Monica/i, /Marisol/i, /Helena/i, /Lucia/i, /Paulina/i,
    /Google.*espa/i, /Microsoft.*Helena/i, /Microsoft.*Sabina/i,
  ];
  const es = voices.filter(v => /^es(-|_|$)/i.test(v.lang));
  for (const re of prefer) {
    const m = es.find(v => re.test(v.name));
    if (m) { _bestVoice = m; return m; }
  }
  // Cualquiera de España
  const esES = es.find(v => /^es-?ES/i.test(v.lang));
  if (esES) { _bestVoice = esES; return esES; }
  // Cualquier español
  if (es[0]) { _bestVoice = es[0]; return es[0]; }
  return null;
}

if ("speechSynthesis" in window) {
  // Cargar voces (asíncrono en algunos navegadores)
  window.speechSynthesis.onvoiceschanged = () => { _bestVoice = null; _pickBestSpanishVoice(); };
  _pickBestSpanishVoice();
}

// ── TTS readiness ───────────────────────────────────────────
// Antes hacíamos un "warm-up" lanzando una utterance silenciosa al primer
// gesto del usuario para evitar que la primera palabra real saliera
// entrecortada. Resultaba que con auriculares causaba un glitch al inicio
// de la primera reproducción real, así que se eliminó. Mantenemos
// `whenTTSReady()` como una promesa resuelta al instante para no romper
// los `await whenTTSReady()` que ya hay en otros componentes.
const _ttsReady = Promise.resolve();
function whenTTSReady() { return _ttsReady; }

// ─── Web Speech (sin audios pregrabados) ────────────────────
// La configuración global (voz preferida + volumen) vive en window.SUPEINGO_AUDIO_CONFIG
// y se gestiona desde la pantalla Settings. La voz preferida (URI) sobrescribe
// la auto-detección.

function _resolveVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const cfg = window.SUPEINGO_AUDIO_CONFIG;
  if (cfg && cfg.voiceURI) {
    const v = voices.find(v => v.voiceURI === cfg.voiceURI);
    if (v) return v;
  }
  return _pickBestSpanishVoice();
}

// ─── Cleaners según el tipo de contenido ──────────────────────
// Tres cleaners especializados, dispatch por `kind` desde speak().
//
// Patrón común: minúsculas para evitar que algunas voces lean
// las mayúsculas como "a mayúscula" en lugar de "a", y normalizar
// espacios. A partir de ahí, cada tipo aplica sus propias reglas.

// LETRA — letras sueltas o pronunciaciones especiales (Y → "i griega",
// CH → "che", LL → "elle"). Tokens muy cortos los marca el motor TTS
// español como abreviaturas y los deletrea ("ge-a"); el punto final
// fuerza que se lean como palabra.
function _cleanLetter(text) {
  const cleaned = String(text)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (cleaned.length > 0 && !/[.,!?]$/.test(cleaned)) {
    return cleaned + ".";
  }
  return cleaned;
}

// SÍLABA — siempre añadimos punto final (todas las sílabas son cortas
// y susceptibles de ser deletreadas). Quitamos también los marcadores
// de silabeo por si llegaran de un copiar-pegar. Capitalizamos solo
// la primera letra ("BA" → "Ba.") porque algunas voces pronuncian
// las sílabas mejor en formato "palabra propia" (con inicial).
function _cleanSyllable(text) {
  let cleaned = String(text)
    .replace(/[·•·|\-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  if (!cleaned) return cleaned;
  cleaned = cleaned[0].toUpperCase() + cleaned.slice(1);
  if (!/[.,!?]$/.test(cleaned)) cleaned += ".";
  return cleaned;
}

// PALABRA — palabras completas o frases cortas. Quita marcadores de
// silabeo (· · - |) y normaliza espacios; sin punto final (las palabras
// >3 letras el motor las pronuncia bien, y un punto fuerza una pausa
// innecesaria si la palabra ya está dentro de una oración).
function _cleanWord(text) {
  return String(text)
    .replace(/[·•·|]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

// Dispatcher — speak() pasa por aquí para elegir el cleaner correcto.
function _cleanForSpeech(text, kind) {
  if (kind === "letter") return _cleanLetter(text);
  if (kind === "syllable") return _cleanSyllable(text);
  return _cleanWord(text); // default: "word"
}

// ── Debug log de TTS ─────────────────────────────────────────
// Anillo de las últimas 50 llamadas a speak(). El TTSDebugPanel se
// suscribe al evento 'supeingo-tts-log' para refrescarse en vivo.
const _TTS_LOG_MAX = 50;
if (typeof window !== "undefined" && !window.__SUPEINGO_TTS_LOG) {
  window.__SUPEINGO_TTS_LOG = [];
}
function _logTTS(entry) {
  if (typeof window === "undefined") return;
  const log = window.__SUPEINGO_TTS_LOG;
  log.push(entry);
  if (log.length > _TTS_LOG_MAX) log.shift();
  try {
    window.dispatchEvent(new CustomEvent("supeingo-tts-log", { detail: entry }));
  } catch (e) {}
}

// Estado interno para evitar que utterances solapadas se entrecorten.
// El Web Speech API de Chrome es frágil: si llamas a speak() mientras una
// utterance previa todavía no ha terminado, o demasiado pronto tras cancel(),
// la siguiente sale cortada o no suena.
let _lastSpeak = { text: "", at: 0 };
let _speakQueue = [];
let _speaking = false;

function _flushQueue() {
  if (_speaking) return;
  const next = _speakQueue.shift();
  if (!next) return;
  _speaking = true;
  const { text, opts } = next;
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "es-ES";
    const v = _resolveVoice();
    if (v) u.voice = v;
    // Velocidad unificada en toda la app: 0.85 — lo bastante lento para
    // que un peque que empieza pueda asociar sonido↔grafía sin presión.
    // `opts.rate` explícito sigue ganando si algún sitio lo necesita.
    u.rate = opts.rate ?? 0.85;
    u.pitch = opts.pitch ?? 1.0;
    // El volumen lo gobierna el sistema operativo — siempre 1.0 a nivel
    // de la utterance. (Antes había un slider en Ajustes; se quitó.)
    u.volume = opts.volume ?? 1.0;
    u.onend = u.onerror = () => { _speaking = false; setTimeout(_flushQueue, 30); };
    window.speechSynthesis.speak(u);
    // Workaround del bug de Chrome donde la cola se "pausa" sola.
    setTimeout(() => {
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch (e) {}
    }, 80);
  } catch (e) {
    _speaking = false;
    setTimeout(_flushQueue, 30);
  }
}

// speak(text, opts) — opts.kind controla el cleaner aplicado:
//   "word"     (default) — palabras y frases. Lowercase, sin punto final.
//   "letter"   — letras o pronunciaciones de letra (Y → "i griega"). Punto final.
//   "syllable" — sílabas (GA, MA, CHE). Sin marcadores de silabeo. Punto final.
//
// Debug: cada llamada se registra en window.__SUPEINGO_TTS_LOG y emite
// un CustomEvent('supeingo-tts-log') para que TTSDebugPanel pueda mostrarlo.
function speak(text, opts = {}) {
  if (!text) return;
  if (!("speechSynthesis" in window)) return;
  const clean = _cleanForSpeech(text, opts.kind);
  if (!clean) return;

  // De-dupe: ignora la misma palabra repetida en menos de 600ms — pasa
  // cuando dos handlers (carga + acierto) disparan a la vez.
  const now = Date.now();
  const isDupe = clean === _lastSpeak.text && now - _lastSpeak.at < 600;
  _logTTS({ raw: text, clean, kind: opts.kind || "word", at: now, dropped: isDupe ? "dupe" : null });
  if (isDupe) return;
  _lastSpeak = { text: clean, at: now };

  try {
    // Si ya hay algo sonando, lo paramos de forma "limpia" y damos
    // un margen al motor antes de encolar la nueva. Sin este margen,
    // Chrome pisa el inicio de la siguiente y se oye entrecortado.
    if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
      window.speechSynthesis.cancel();
      _speaking = false;
      _speakQueue = [{ text: clean, opts }];
      setTimeout(_flushQueue, 120);
    } else {
      _speakQueue.push({ text: clean, opts });
      _flushQueue();
    }
  } catch (e) {}
}

// ------------------------------------------------------------
// WordImage — renderiza la representación gráfica de una palabra del
// diccionario. Si la entrada tiene `image`, carga ese fichero desde
// assets/; si no, cae al `emoji` de la entrada. Si no hay ninguno de
// los dos, devuelve un placeholder discreto (cuadrado punteado) en vez
// de romper la UI.
// `entry` puede ser una entrada de diccionario o cualquier objeto con
// `{ image?, emoji? }`. `size` es el lado en píxeles a la escala 1×; si
// `scale` es true (por defecto) se aplica `var(--scale)` para que crezca
// con el ajuste de tamaño global.
// ------------------------------------------------------------
function WordImage({ entry, size = 32, scale = true, style = {} }) {
  const px = scale ? `calc(${size}px * var(--scale))` : `${size}px`;
  // `image` lleva ruta+extensión relativa a assets/ (png/webp/svg/…).
  const imgSrc = entry && entry.image ? `assets/${entry.image}` : null;
  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt=""
        aria-hidden
        draggable={false}
        style={{
          width: px,
          height: px,
          display: "block",
          filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.08))",
          ...style,
        }}
      />
    );
  }
  if (entry && entry.emoji) {
    return (
      <span
        aria-hidden
        style={{ fontSize: px, lineHeight: 1, display: "inline-block", ...style }}
      >{entry.emoji}</span>
    );
  }
  // Sin emoji ni image — placeholder discreto que no se confunde con
  // contenido real. Cuadrado punteado al tamaño esperado.
  return (
    <span
      aria-hidden
      style={{
        width: px,
        height: px,
        display: "inline-block",
        border: "2px dashed var(--ink-faint)",
        borderRadius: 6,
        ...style,
      }}
    />
  );
}

// ------------------------------------------------------------
// Ayudante — un niño/a con gorra de béisbol. Aspecto neutro y amigable.
// Formas geométricas simples (placeholder; futuro: ilustración propia).
// ------------------------------------------------------------
function Helper({ size = 96, mood = "happy", style = {} }) {
  const eye = mood === "sad" ? (
    <>
      <path d="M 35 50 Q 40 46 45 50" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 55 50 Q 60 46 65 50" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </>
  ) : mood === "cheer" ? (
    <>
      <path d="M 35 50 Q 40 45 45 50" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M 55 50 Q 60 45 65 50" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </>
  ) : (
    <>
      <circle cx="40" cy="48" r="3" fill="#2A2A33"/>
      <circle cx="60" cy="48" r="3" fill="#2A2A33"/>
    </>
  );
  const mouth = mood === "sad" ? (
    <path d="M 44 64 Q 50 60 56 64" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  ) : mood === "cheer" ? (
    <path d="M 42 60 Q 50 70 58 60" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  ) : (
    <path d="M 44 62 Q 50 66 56 62" stroke="#2A2A33" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  );

  return (
    <div style={{
      width: size, height: size,
      animation: "drift 3.5s ease-in-out infinite",
      ...style
    }}>
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        {/* cuerpo (camiseta) */}
        <path d="M 28 86 Q 28 70 38 68 L 62 68 Q 72 70 72 86 L 72 96 L 28 96 Z" fill="var(--secondary)"/>
        {/* cuello */}
        <rect x="44" y="62" width="12" height="8" fill="#F4D2B6"/>
        {/* cara */}
        <ellipse cx="50" cy="46" rx="22" ry="22" fill="#F4D2B6"/>
        {/* orejas */}
        <ellipse cx="28" cy="46" rx="3" ry="5" fill="#F4D2B6"/>
        <ellipse cx="72" cy="46" rx="3" ry="5" fill="#F4D2B6"/>
        {/* pelo (flequillo) */}
        <path d="M 30 38 Q 30 22 50 22 Q 70 22 70 38 Q 66 32 60 34 Q 54 28 50 32 Q 44 28 40 34 Q 34 32 30 38 Z" fill="#3D2A1F"/>
        {/* mejillas rosadas */}
        <circle cx="33" cy="54" r="3.5" fill="#F4978E" opacity="0.55"/>
        <circle cx="67" cy="54" r="3.5" fill="#F4978E" opacity="0.55"/>
        {/* ojos */}
        {eye}
        {/* boca */}
        {mouth}
        {/* gorra de béisbol */}
        {/* visera saliendo hacia la derecha */}
        <path d="M 50 30 Q 78 28 82 36 Q 80 38 70 36 Q 58 33 50 33 Z"
          fill="var(--accent-strong)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round"/>
        {/* copa de la gorra (cubre coronilla y flequillo superior) */}
        <path d="M 28 32 Q 28 16 50 16 Q 72 16 72 32 Q 72 35 70 35 L 30 35 Q 28 35 28 32 Z"
          fill="var(--accent)" stroke="var(--ink)" strokeWidth="2" strokeLinejoin="round"/>
        {/* costuras de la gorra (detalle) */}
        <path d="M 50 16 L 50 35" stroke="var(--ink)" strokeWidth="1.2" opacity="0.4" fill="none"/>
        <path d="M 35 17 Q 40 28 38 35" stroke="var(--ink)" strokeWidth="1.2" opacity="0.3" fill="none"/>
        <path d="M 65 17 Q 60 28 62 35" stroke="var(--ink)" strokeWidth="1.2" opacity="0.3" fill="none"/>
        {/* botón superior */}
        <circle cx="50" cy="16" r="2.2" fill="var(--accent-strong)" stroke="var(--ink)" strokeWidth="1.2"/>
      </svg>
    </div>
  );
}

// ------------------------------------------------------------
// Burbujita del niño dando una pista
// "compact" → bocadillo a la derecha del personaje, ideal en headers
// ------------------------------------------------------------
function HelperHint({ children, mood = "happy", size = 64, position = "inline" }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--space-3)",
      padding: position === "inline" ? "var(--space-2) var(--space-4)" : 0,
    }}>
      <Helper size={size} mood={mood}/>
      <div style={{
        background: "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-md)",
        padding: "12px 16px",
        boxShadow: "0 3px 0 var(--ink)",
        fontWeight: 600,
        fontSize: "calc(17px * var(--scale))",
        lineHeight: 1.35,
        position: "relative",
        flex: 1,
      }}>
        {children}
        <span style={{
          position: "absolute", left: -10, top: "50%", transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "8px solid transparent",
          borderBottom: "8px solid transparent",
          borderRight: "10px solid var(--ink)",
        }}/>
        <span style={{
          position: "absolute", left: -6, top: "50%", transform: "translateY(-50%)",
          width: 0, height: 0,
          borderTop: "5px solid transparent",
          borderBottom: "5px solid transparent",
          borderRight: "7px solid var(--surface)",
        }}/>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// Botón flotante de ayuda — el niño aparece y dice una pista extra
// ------------------------------------------------------------
function HelpButton({ hint }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => { setOpen(true); if (hint) speak(hint); }}
        aria-label="Ayuda"
        style={{
          position: "fixed", right: 14, bottom: 14, zIndex: 60,
          width: 64, height: 64, borderRadius: "50%",
          background: "var(--warn)",
          border: "3px solid var(--ink)",
          boxShadow: "0 5px 0 var(--ink)",
          display: "grid", placeItems: "center",
          fontWeight: 700, fontSize: 26,
          fontFamily: "Andika, Fredoka, sans-serif",
        }}
      >?</button>
      {open && (
        <div onClick={() => setOpen(false)} style={{
          position: "fixed", inset: 0, background: "rgba(42,42,51,0.4)",
          zIndex: 70, display: "grid", placeItems: "end center",
          padding: "0 16px 90px",
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--bg)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--r-lg)",
            padding: "var(--space-4)",
            boxShadow: "0 6px 0 var(--ink)",
            maxWidth: 360, width: "100%",
            animation: "pop 200ms ease-out",
          }}>
            <HelperHint size={72} mood="happy">{hint}</HelperHint>
          </div>
        </div>
      )}
    </>
  );
}

// ------------------------------------------------------------
// Indicador de audio — botón altavoz con ondas animadas
// ------------------------------------------------------------
// SpeakButton — botón de altavoz con ondas animadas.
// Acepta `triggerRef`: una ref a la que se asigna la función que dispara
// la pronunciación + la animación, para que un contenedor padre pueda
// activarla desde un click fuera (p.ej., el card de la imagen entera).
const SpeakButton = React.forwardRef(function SpeakButton(
  { text, label = "Escuchar", size = 64, variant = "primary", kind, triggerRef },
  ref
) {
  const [playing, setPlaying] = useState(false);

  const handle = () => {
    setPlaying(true);
    speak(text, kind ? { kind } : undefined);
    setTimeout(() => setPlaying(false), 1200);
  };

  // Exponer `handle` para activación externa. Reasignamos en cada render
  // para que la closure capture el `text`/`kind` actuales.
  useEffect(() => {
    if (triggerRef) triggerRef.current = handle;
    return () => { if (triggerRef && triggerRef.current === handle) triggerRef.current = null; };
  });

  const bg = variant === "ghost" ? "transparent" : "var(--surface)";
  const border = variant === "ghost" ? "none" : "3px solid var(--ink)";

  return (
    <button
      ref={ref}
      onClick={(e) => { e.stopPropagation(); handle(); }}
      aria-label={`${label}: ${text}`}
      style={{
        width: size, height: size,
        background: bg,
        border,
        borderRadius: "50%",
        boxShadow: variant === "ghost" ? "none" : "var(--shadow-md)",
        position: "relative",
        display: "grid", placeItems: "center",
        transition: "transform 120ms ease",
        flexShrink: 0,
      }}
      onPointerDown={e => e.currentTarget.style.transform = "translateY(2px) scale(0.96)"}
      onPointerUp={e => e.currentTarget.style.transform = ""}
      onPointerLeave={e => e.currentTarget.style.transform = ""}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5}>
        <path d="M 4 9 L 4 15 L 9 15 L 14 19 L 14 5 L 9 9 Z" fill="var(--ink)"/>
        {/* ondas */}
        <path d="M 17 9 Q 19 12 17 15" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round"
              opacity={playing ? 1 : 0.4}/>
        <path d="M 19.5 7 Q 22.5 12 19.5 17" stroke="var(--ink)" strokeWidth="2" fill="none" strokeLinecap="round"
              opacity={playing ? 1 : 0.25}/>
      </svg>
      {playing && (
        <span style={{
          position: "absolute", inset: -4,
          borderRadius: "50%",
          border: "3px solid var(--accent)",
          // `forwards` mantiene el estado final del keyframe (opacity:0,
          // scale 2.4) hasta que el span desaparece al apagarse `playing`.
          // Sin esto, tras los 800ms de animación el span volvía un instante
          // al tamaño original antes de unmount → el "doble flash" feo.
          animation: "ping 800ms ease-out forwards",
          pointerEvents: "none",
        }}/>
      )}
    </button>
  );
});

// ------------------------------------------------------------
// Estrella de recompensa
// ------------------------------------------------------------
function Star({ filled = false, size = 32, delay = 0 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size}
         style={{
           transition: "all 300ms ease",
           transitionDelay: `${delay}ms`,
           transform: filled ? "scale(1)" : "scale(0.85)",
         }}>
      <path d="M 12 2 L 14.5 8.5 L 21.5 9 L 16 13.5 L 18 20.5 L 12 16.5 L 6 20.5 L 8 13.5 L 2.5 9 L 9.5 8.5 Z"
            fill={filled ? "var(--warn)" : "transparent"}
            stroke={filled ? "var(--warn)" : "var(--ink-faint)"}
            strokeWidth="1.5"
            strokeLinejoin="round"/>
    </svg>
  );
}

// ------------------------------------------------------------
// Confeti sutil — chispitas en aciertos importantes
// ------------------------------------------------------------
function Confetti({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 14 });
  return (
    <div style={{
      position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden", zIndex: 50
    }}>
      {pieces.map((_, i) => {
        const colors = ["var(--accent)", "var(--warn)", "var(--ok)", "var(--secondary)"];
        const x = (i / pieces.length) * 100 + (Math.random() - 0.5) * 8;
        const delay = Math.random() * 200;
        const dur = 700 + Math.random() * 400;
        const sz = 6 + Math.random() * 6;
        return (
          <span key={i} style={{
            position: "absolute",
            left: `${x}%`,
            top: "30%",
            width: sz, height: sz,
            background: colors[i % colors.length],
            borderRadius: i % 2 === 0 ? "50%" : "2px",
            animation: `confetti-fall ${dur}ms ease-out ${delay}ms forwards`,
          }}/>
        );
      })}
    </div>
  );
}

// ------------------------------------------------------------
// Botón grande primario — estilo "ficha de cartón"
// ------------------------------------------------------------
function BigButton({ children, onClick, color = "accent", icon = null, style = {}, disabled = false }) {
  const colorVar = color === "accent" ? "var(--accent)"
    : color === "secondary" ? "var(--secondary)"
    : color === "ok" ? "var(--ok)"
    : color;
  const colorStrong = color === "accent" ? "var(--accent-strong)"
    : color === "secondary" ? "var(--secondary-strong)"
    : "var(--ok)";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: colorVar,
        color: "var(--ink)",
        padding: "var(--space-4) var(--space-6)",
        borderRadius: "var(--r-lg)",
        border: `3px solid var(--ink)`,
        boxShadow: `0 5px 0 var(--ink)`,
        fontSize: "calc(20px * var(--scale))",
        fontWeight: 600,
        display: "inline-flex",
        alignItems: "center",
        gap: "var(--space-3)",
        minHeight: "var(--tap)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
        opacity: disabled ? 0.5 : 1,
        ...style,
      }}
      onPointerDown={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(4px)";
        e.currentTarget.style.boxShadow = "0 1px 0 var(--ink)";
      }}
      onPointerUp={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
      }}
      onPointerLeave={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
      }}
      onPointerCancel={e => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
      }}
    >
      {icon && <span aria-hidden style={{ fontSize: "1.2em" }}>{icon}</span>}
      {children}
    </button>
  );
}

// ------------------------------------------------------------
// Header con flecha atrás
// ------------------------------------------------------------
function ScreenHeader({ title, onBack, right = null }) {
  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-3)",
      padding: "var(--space-4) var(--space-5)",
      position: "relative",
      zIndex: 2,
    }}>
      {onBack && (
        <button onClick={onBack} aria-label="Volver" style={{
          width: 48, height: 48,
          borderRadius: "50%",
          background: "var(--surface)",
          border: "3px solid var(--ink)",
          boxShadow: "0 3px 0 var(--ink)",
          display: "grid", placeItems: "center",
          flexShrink: 0,
        }}>
          <svg viewBox="0 0 24 24" width={22} height={22}>
            <path d="M 15 6 L 9 12 L 15 18" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      )}
      <h1 style={{
        margin: 0,
        fontSize: "calc(22px * var(--scale))",
        fontWeight: 700,
        flex: 1,
      }}>{title}</h1>
      {right}
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
// TTSDebugPanel — panel flotante que muestra las últimas llamadas
// a speak(): texto crudo, texto limpio enviado al TTS, kind y dedupe.
// Se monta a nivel de App; se muestra solo si `enabled` es true.
// ─────────────────────────────────────────────────────────────
function TTSDebugPanel({ enabled }) {
  const [entries, setEntries] = useState(() =>
    typeof window !== "undefined" ? [...(window.__SUPEINGO_TTS_LOG || [])] : []
  );
  const [collapsed, setCollapsed] = useState(false);
  // Mini-laboratorio: un input que dispara speak() con el `kind` elegido,
  // para probar a mano qué pronunciación funciona en cada motor de voz.
  const [labText, setLabText] = useState("");

  useEffect(() => {
    if (!enabled) return;
    const onLog = () => setEntries([...(window.__SUPEINGO_TTS_LOG || [])]);
    window.addEventListener("supeingo-tts-log", onLog);
    return () => window.removeEventListener("supeingo-tts-log", onLog);
  }, [enabled]);

  if (!enabled) return null;

  const clearLog = () => {
    if (window.__SUPEINGO_TTS_LOG) window.__SUPEINGO_TTS_LOG.length = 0;
    setEntries([]);
  };

  // Manda el texto sin pasar por los cleaners — directo al motor de voz.
  // Sirve para probar qué grafías pronuncia bien la voz actual ("go" vs
  // "gó" vs "góu"…). Se registra en el log con kind="raw".
  const tryRaw = () => {
    const t = labText;
    if (!t) return;
    if (!("speechSynthesis" in window)) return;
    _logTTS({ raw: t, clean: t, kind: "raw", at: Date.now(), dropped: null });
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(t);
      u.lang = "es-ES";
      const v = _resolveVoice();
      if (v) u.voice = v;
      u.rate = 0.95;
      u.pitch = 1.0;
      u.volume = 1.0;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  };

  // Las más recientes arriba.
  const visible = [...entries].reverse();

  return (
    <div style={{
      position: "fixed",
      right: 14,
      bottom: 14,
      width: collapsed ? 160 : 360,
      maxHeight: collapsed ? 44 : 420,
      background: "rgba(20, 20, 24, 0.92)",
      color: "#f4f4f6",
      border: "2px solid #4a4a55",
      borderRadius: 12,
      boxShadow: "0 6px 20px rgba(0,0,0,0.35)",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
      fontSize: 12,
      zIndex: 9999,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: "rgba(255,255,255,0.06)",
        borderBottom: collapsed ? "none" : "1px solid #3a3a45",
        cursor: "pointer",
        userSelect: "none",
      }} onClick={() => setCollapsed(c => !c)}>
        <span style={{ fontWeight: 700, letterSpacing: "0.04em" }}>🐞 TTS DEBUG</span>
        <span style={{ marginLeft: "auto", color: "#9ca0aa" }}>
          {collapsed ? `${entries.length}` : `${entries.length}/${_TTS_LOG_MAX}`}
        </span>
        {!collapsed && (
          <button
            onClick={(e) => { e.stopPropagation(); clearLog(); }}
            style={{
              background: "transparent",
              color: "#9ca0aa",
              border: "1px solid #4a4a55",
              borderRadius: 6,
              padding: "2px 6px",
              fontSize: 11,
              cursor: "pointer",
              fontFamily: "inherit",
            }}>clear</button>
        )}
      </div>

      {/* Laboratorio — disparar speak() a mano con el `kind` elegido */}
      {!collapsed && (
        <div style={{
          padding: "8px 10px",
          borderBottom: "1px solid #3a3a45",
          background: "rgba(255,255,255,0.03)",
        }}>
          <input
            type="text"
            value={labText}
            onChange={(e) => setLabText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") tryRaw();
            }}
            placeholder="texto crudo → TTS (Enter para probar)…"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(0,0,0,0.35)",
              color: "#f4f4f6",
              border: "1px solid #4a4a55",
              borderRadius: 6,
              padding: "5px 8px",
              fontSize: 12,
              fontFamily: "inherit",
              outline: "none",
              marginBottom: 6,
            }}
          />
          <button
            onClick={tryRaw}
            disabled={!labText}
            style={{
              width: "100%",
              background: "transparent",
              color: "#fda4af",
              border: "1px solid #fda4af55",
              borderRadius: 6,
              padding: "5px 0",
              fontSize: 11,
              fontWeight: 700,
              cursor: labText ? "pointer" : "not-allowed",
              opacity: labText ? 1 : 0.4,
              fontFamily: "inherit",
              textTransform: "lowercase",
              letterSpacing: "0.04em",
            }}
          >▶ hablar (sin cleaner)</button>
        </div>
      )}
      {!collapsed && (
        <div style={{
          padding: "6px 10px",
          overflowY: "auto",
          flex: 1,
        }}>
          {visible.length === 0 && (
            <div style={{ color: "#6e7280", padding: "12px 0", textAlign: "center" }}>
              (sin llamadas todavía)
            </div>
          )}
          {visible.map((e, i) => {
            const kindColor = e.kind === "letter" ? "#7dd3fc"
              : e.kind === "syllable" ? "#fcd34d"
              : e.kind === "raw" ? "#fda4af"
              : "#a7f3d0";
            return (
              <div key={`${e.at}-${i}`} style={{
                padding: "5px 0",
                borderBottom: i < visible.length - 1 ? "1px dashed #2a2a33" : "none",
                opacity: e.dropped ? 0.45 : 1,
              }}>
                <div style={{ display: "flex", gap: 6, alignItems: "baseline" }}>
                  <span style={{ color: kindColor, fontWeight: 700, minWidth: 56 }}>
                    {e.kind}
                  </span>
                  <span style={{ color: "#f4f4f6", fontWeight: 600 }}>
                    "{e.clean}"
                  </span>
                  {e.dropped && (
                    <span style={{ color: "#fca5a5", fontSize: 10, marginLeft: "auto" }}>
                      [{e.dropped}]
                    </span>
                  )}
                </div>
                {String(e.raw) !== e.clean && (
                  <div style={{ color: "#9ca0aa", fontSize: 11, paddingLeft: 60, marginTop: 1 }}>
                    raw: "{e.raw}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Filtro "kid-safe": oculta palabras con tag "miedo" cuando el ajuste
// "Ocultar palabras que dan miedo" está activo. Se usa en los juegos y
// en Vocabulario para que el toggle tenga efecto global. Acepta tanto
// entradas del diccionario (objeto con .tags) como strings — para los
// strings, busca su entrada en dictionaryByWord para leer los tags.
function isScaryEntry(entryOrWord) {
  const cfg = window.SUPEINGO_CONTENT_CONFIG;
  if (!cfg || !cfg.hideScary) return false;
  if (!entryOrWord) return false;
  if (typeof entryOrWord === "string") {
    const dict = (window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionaryByWord) || {};
    const e = dict[entryOrWord];
    return !!(e && (e.tags || []).includes("miedo"));
  }
  return (entryOrWord.tags || []).includes("miedo");
}
function filterScary(arr) {
  return (arr || []).filter(x => !isScaryEntry(x));
}

// Exportar
Object.assign(window, {
  speak, whenTTSReady, Helper, HelperHint, HelpButton, SpeakButton, Star, Confetti, BigButton, ScreenHeader, TTSDebugPanel, WordImage,
  isScaryEntry, filterScary,
});

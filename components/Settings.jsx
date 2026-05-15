// Pantalla de Configuración — Audio (voz) + Tamaño de elementos.
// Persistencia en localStorage. Se muestra automáticamente la primera vez.
//
// Nota: el volumen se controla desde el sistema operativo. No se expone
// dentro de la app porque era ruido innecesario para un dispositivo de
// uso individual (no se va a hacer otra cosa al mismo tiempo).

const SETTINGS_KEY = "supeingo:settings:v1";

const SETTINGS_DEFAULTS = {
  voiceURI: null,   // null = auto (la mejor voz española disponible)
  includeDigraphs: true, // incluir CH y LL como letras (enseñanza tradicional)
  hideScary: true, // ocultar palabras con tag "miedo" (araña, serpiente…) — kid-safe por defecto
  // "debug" antes era "ttsDebug" (solo logs de TTS). Ahora es un modo
  // depuración general: TTS log + selector de palabra en Forma palabras.
  debug: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Migraciones in-place del JSON guardado:
    //  • ttsDebug → debug (modo depuración general).
    //  • volume eliminado (lo gobierna el OS).
    if (parsed.ttsDebug !== undefined && parsed.debug === undefined) {
      parsed.debug = !!parsed.ttsDebug;
    }
    delete parsed.ttsDebug;
    delete parsed.volume;
    return { ...SETTINGS_DEFAULTS, ...parsed };
  } catch (e) { return null; }
}

function saveSettings(s) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) {}
}

function applySettings(s) {
  // Audio: la función speak() lo lee de window.SUPEINGO_AUDIO_CONFIG
  window.SUPEINGO_AUDIO_CONFIG = { voiceURI: s.voiceURI };
  // Tamaño: var CSS fija a 1 — la opción de escala se eliminó del menú.
  // Mantenemos --scale para que los `calc(... * var(--scale))` sigan
  // resolviendo, pero ya no es configurable.
  document.documentElement.style.setProperty("--scale", "1");
  // Pedagogía
  window.SUPEINGO_TEACHING_CONFIG = {
    includeDigraphs: !!s.includeDigraphs,
  };
  // Contenido (filtros de pool en juegos)
  window.SUPEINGO_CONTENT_CONFIG = {
    hideScary: !!s.hideScary,
  };
  // Debug — un único flag global. Componentes lo leen para decidir si
  // muestran panel TTS, selector de palabra en juegos, etc.
  window.SUPEINGO_DEBUG_CONFIG = {
    debug: !!s.debug,
  };
  // Notificar a componentes que reaccionan en vivo (sin remontar)
  try { window.dispatchEvent(new CustomEvent("supeingo-debug-change", { detail: { debug: !!s.debug } })); } catch (e) {}
}

// Hook para usar settings con persistencia automática
function useSettings() {
  const [settings, setSettings] = useState(() => loadSettings() || SETTINGS_DEFAULTS);
  useEffect(() => { applySettings(settings); }, [settings]);
  const update = (patch) => setSettings(prev => {
    const next = { ...prev, ...patch };
    saveSettings(next);
    return next;
  });
  return [settings, update];
}

// ────────────────────────────────────────────────────────────
// Pantalla de Ajustes
// ────────────────────────────────────────────────────────────
function Settings({ settings, onChange, onDone, isFirstTime }) {
  // Cargar voces (asíncrono en algunos navegadores)
  const [voices, setVoices] = useState(() =>
    "speechSynthesis" in window ? window.speechSynthesis.getVoices() : []
  );
  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    const sync = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.addEventListener("voiceschanged", sync);
    sync();
    return () => window.speechSynthesis.removeEventListener("voiceschanged", sync);
  }, []);

  // Filtrar voces en español, ordenar por preferencia
  const spanishVoices = useMemo(() => {
    const es = voices.filter(v => /^es(-|_|$)/i.test(v.lang));
    const score = (v) => {
      let s = 0;
      if (/Mónica|Monica|Helena|Marisol|Lucia|Paulina/i.test(v.name)) s += 100;
      if (/Google.*espa/i.test(v.name)) s += 80;
      if (/Microsoft/i.test(v.name)) s += 60;
      if (/^es-ES/i.test(v.lang)) s += 30;
      else if (/^es-MX/i.test(v.lang)) s += 20;
      else if (/^es-/i.test(v.lang)) s += 10;
      return s;
    };
    return [...es].sort((a, b) => score(b) - score(a));
  }, [voices]);

  // Identificar la voz "auto" (la que speak() escogería si voiceURI=null)
  const autoVoice = spanishVoices[0];

  const previewVoice = (uri) => {
    // Aplicar temporalmente la voz para que speak() la use
    const prev = window.SUPEINGO_AUDIO_CONFIG;
    window.SUPEINGO_AUDIO_CONFIG = { voiceURI: uri };
    speak("Hola, soy tu compañero de español");
    // Restaurar la config global tras el preview
    setTimeout(() => { window.SUPEINGO_AUDIO_CONFIG = prev; }, 50);
  };

  return (
    <div style={{
      position: "relative",
      minHeight: "100vh",
      paddingBottom: isFirstTime ? "calc(var(--space-7) + 80px)" : "var(--space-5)",
      background: "var(--bg)",
    }}>
      <div className="bg-decor"/>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center",
        gap: "var(--space-3)",
        padding: "var(--space-5) var(--space-4) var(--space-3)",
        position: "relative", zIndex: 2,
      }}>
        {!isFirstTime && (
          <button
            onClick={onDone}
            aria-label="Volver"
            style={{
              width: 44, height: 44,
              background: "var(--surface)",
              border: "3px solid var(--ink)",
              borderRadius: "50%",
              boxShadow: "0 3px 0 var(--ink)",
              display: "grid", placeItems: "center",
              flexShrink: 0,
            }}
          >
            <svg viewBox="0 0 24 24" width={20} height={20}>
              <path d="M 14 6 L 8 12 L 14 18" stroke="var(--ink)" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <h1 style={{
          margin: 0,
          fontSize: "calc(28px * var(--scale))",
          fontFamily: "Fredoka, sans-serif",
          fontWeight: 700,
          letterSpacing: "-0.01em",
        }}>
          {isFirstTime ? "Antes de empezar…" : "Ajustes"}
        </h1>
      </div>

      {isFirstTime && (
        <div style={{
          padding: "0 var(--space-4) var(--space-4)",
          position: "relative", zIndex: 2,
        }}>
          <HelperHint size={56} mood="happy">
            Configura el sonido y el tamaño. Podrás cambiarlo en cualquier momento.
          </HelperHint>
        </div>
      )}

      {/* Sección: Audio */}
      <Section title="Audio" icon={<AudioIcon/>}>
        <Field label="Voz" hint="Elige cómo suenan las letras, sílabas y palabras">
          <select
            value={settings.voiceURI || ""}
            onChange={(e) => onChange({ voiceURI: e.target.value || null })}
            style={selectStyle}
          >
            <option value="">
              {autoVoice ? `Automática (${autoVoice.name})` : "Automática"}
            </option>
            {spanishVoices.map(v => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} — {v.lang}
              </option>
            ))}
          </select>
        </Field>

        {spanishVoices.length === 0 && (
          <p style={warningStyle}>
            No hay voces en español instaladas en este dispositivo.
            La app usará la voz por defecto del sistema, que puede no sonar bien.
          </p>
        )}

        {/* Botón Probar — usa la voz actual. El volumen lo controla
            el sistema, no se expone aquí. */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-2)" }}>
          <button
            onClick={() => previewVoice(settings.voiceURI)}
            style={bigPreviewBtnStyle}
            aria-label="Probar voz"
          >
            <PlayIcon/> Probar
          </button>
        </div>

        <p style={{
          margin: 0,
          fontSize: "calc(12px * var(--scale))",
          color: "var(--ink-soft)",
          textAlign: "center",
          lineHeight: 1.4,
        }}>
          El volumen se ajusta con los botones del dispositivo.
        </p>
      </Section>

      {/* Sección: Aprendizaje */}
      <Section title="Aprendizaje" icon={<TeachingIcon/>}>
        <Toggle
          label="Incluir CH y LL"
          hint="Aparecen como letras propias en el abecedario."
          checked={!!settings.includeDigraphs}
          onChange={(v) => onChange({ includeDigraphs: v })}
        />
        <Toggle
          label="Ocultar palabras que dan miedo"
          hint="Quita araña, serpiente, murciélago, lagarto y ratón del pool de los juegos y del vocabulario."
          checked={!!settings.hideScary}
          onChange={(v) => onChange({ hideScary: v })}
        />
      </Section>

      {/* Sección: Depuración (uso interno) */}
      <Section title="Depuración" icon={<DebugIcon/>}>
        <Toggle
          label="Modo depuración"
          hint="Activa herramientas internas: panel flotante con las últimas llamadas a la voz (texto crudo y limpio, tipo) y selector de palabra concreta dentro de los juegos."
          checked={!!settings.debug}
          onChange={(v) => onChange({ debug: v })}
        />
      </Section>

      {/* Footer fijo — solo en la primera vez */}
      {isFirstTime && (
      <div style={{
        position: "fixed",
        bottom: 0, left: 0, right: 0,
        maxWidth: 480, margin: "0 auto",
        padding: "var(--space-4)",
        background: "var(--bg)",
        borderTop: "3px solid var(--ink)",
        zIndex: 50,
      }}>
        <button
          onClick={onDone}
          style={{
            width: "100%",
            minHeight: 56,
            background: "var(--ok)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--r-lg)",
            boxShadow: "0 5px 0 var(--ink)",
            fontSize: "calc(18px * var(--scale))",
            fontWeight: 700,
            fontFamily: "Fredoka, sans-serif",
            color: "var(--ink)",
            cursor: "pointer",
            transition: "transform 120ms ease, box-shadow 120ms ease",
          }}
          onPointerDown={e => {
            e.currentTarget.style.transform = "translateY(3px)";
            e.currentTarget.style.boxShadow = "0 2px 0 var(--ink)";
          }}
          onPointerUp={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
          }}
          onPointerLeave={e => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 5px 0 var(--ink)";
          }}
        >
          Empezar
        </button>
      </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// Helpers visuales
// ────────────────────────────────────────────────────────────
function Section({ title, icon, children }) {
  return (
    <div style={{
      margin: "0 var(--space-4) var(--space-4)",
      background: "var(--surface)",
      border: "3px solid var(--ink)",
      borderRadius: "var(--r-lg)",
      boxShadow: "0 4px 0 var(--ink)",
      padding: "var(--space-4)",
      position: "relative", zIndex: 2,
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        marginBottom: "var(--space-3)",
        paddingBottom: "var(--space-3)",
        borderBottom: "2px dashed var(--ink-faint)",
      }}>
        <div style={{
          width: 44, height: 44,
          background: "var(--accent)",
          border: "3px solid var(--ink)",
          borderRadius: "var(--r-sm)",
          display: "grid", placeItems: "center",
          flexShrink: 0,
        }}>{icon}</div>
        <h2 style={{
          margin: 0,
          fontSize: "calc(20px * var(--scale))",
          fontFamily: "Fredoka, sans-serif",
          fontWeight: 700,
        }}>{title}</h2>
      </div>
      <div style={{ display: "grid", gap: "var(--space-3)" }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <div style={{
        fontSize: "calc(14px * var(--scale))",
        fontWeight: 700,
        marginBottom: 6,
        color: "var(--ink)",
      }}>{label}</div>
      {hint && (
        <div style={{
          fontSize: "calc(12px * var(--scale))",
          color: "var(--ink-soft)",
          marginBottom: 8,
        }}>{hint}</div>
      )}
      <div style={{
        display: "flex",
        gap: "var(--space-2)",
        alignItems: "center",
        flexWrap: "wrap",
      }}>
        {children}
      </div>
    </div>
  );
}

const selectStyle = {
  flex: "1 1 220px",
  minHeight: 44,
  padding: "0 14px",
  background: "var(--bg-2)",
  border: "3px solid var(--ink)",
  borderRadius: "var(--r-md)",
  fontSize: "calc(14px * var(--scale))",
  fontFamily: "Fredoka, sans-serif",
  fontWeight: 600,
  color: "var(--ink)",
  appearance: "none",
  cursor: "pointer",
  backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'><path d='M 1 1 L 6 6 L 11 1' stroke='%232A2A33' stroke-width='2' fill='none' stroke-linecap='round'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 14px center",
  backgroundSize: "12px",
  paddingRight: 38,
};

const previewBtnStyle = {
  minHeight: 44,
  padding: "0 14px",
  background: "var(--surface)",
  border: "3px solid var(--ink)",
  borderRadius: "var(--r-md)",
  boxShadow: "0 3px 0 var(--ink)",
  fontSize: "calc(14px * var(--scale))",
  fontFamily: "Fredoka, sans-serif",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
};

const bigPreviewBtnStyle = {
  minHeight: 52,
  padding: "0 28px",
  background: "var(--accent)",
  border: "3px solid var(--ink)",
  borderRadius: "var(--r-md)",
  boxShadow: "0 4px 0 var(--ink)",
  fontSize: "calc(16px * var(--scale))",
  fontFamily: "Fredoka, sans-serif",
  fontWeight: 700,
  color: "var(--ink)",
  display: "inline-flex",
  alignItems: "center",
  gap: 10,
  cursor: "pointer",
};

const warningStyle = {
  margin: 0,
  fontSize: "calc(13px * var(--scale))",
  background: "var(--warn-soft, #FFF6E0)",
  border: "2px solid var(--warn, #F4B860)",
  borderRadius: "var(--r-md)",
  padding: "10px 12px",
  color: "var(--ink)",
  lineHeight: 1.4,
};

function AudioIcon() {
  return (
    <svg viewBox="0 0 24 24" width={22} height={22}>
      <path d="M 4 9 L 4 15 L 9 15 L 14 19 L 14 5 L 9 9 Z" fill="var(--ink)"/>
      <path d="M 17 8 Q 20 12 17 16" stroke="var(--ink)" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14}>
      <path d="M 4 3 L 13 8 L 4 13 Z" fill="var(--ink)"/>
    </svg>
  );
}

function TeachingIcon() {
  // Birrete + libro abierto, simplificado.
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M 3 8 L 12 4 L 21 8 L 12 12 Z" fill="var(--ink)"/>
      <path d="M 7 10 L 7 15 C 7 16.5 9.2 17.5 12 17.5 C 14.8 17.5 17 16.5 17 15 L 17 10"/>
      <path d="M 21 8 L 21 13"/>
    </svg>
  );
}

function DebugIcon() {
  // Bicho/insecto estilizado, en línea con el lenguaje del resto.
  return (
    <svg viewBox="0 0 24 24" width={22} height={22} fill="none" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="13" rx="5" ry="6.5" fill="var(--ink)"/>
      <path d="M 12 6.5 L 12 4"/>
      <path d="M 10.5 5 L 13.5 5"/>
      <path d="M 7 9 L 4 7.5"/>
      <path d="M 7 13 L 3.5 13"/>
      <path d="M 7 17 L 4 18.5"/>
      <path d="M 17 9 L 20 7.5"/>
      <path d="M 17 13 L 20.5 13"/>
      <path d="M 17 17 L 20 18.5"/>
    </svg>
  );
}

// Toggle estilo switch — accesible y consistente con la estética blocky.
function Toggle({ label, hint, checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        width: "100%",
        textAlign: "left",
        padding: "var(--space-3)",
        background: "var(--bg-2)",
        border: "3px solid var(--ink)",
        borderRadius: "var(--r-md)",
        cursor: "pointer",
        font: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: "calc(15px * var(--scale))",
          fontWeight: 700,
          fontFamily: "Fredoka, sans-serif",
          color: "var(--ink)",
        }}>{label}</div>
        {hint && (
          <div style={{
            fontSize: "calc(12px * var(--scale))",
            color: "var(--ink-soft)",
            marginTop: 4,
            lineHeight: 1.35,
          }}>{hint}</div>
        )}
      </div>
      <span aria-hidden style={{
        position: "relative",
        width: 56, height: 32,
        flexShrink: 0,
        background: checked ? "var(--ok)" : "var(--surface)",
        border: "3px solid var(--ink)",
        borderRadius: 999,
        transition: "background 160ms ease",
      }}>
        <span style={{
          position: "absolute",
          top: 2, left: checked ? 26 : 2,
          width: 22, height: 22,
          background: "var(--ink)",
          borderRadius: "50%",
          transition: "left 160ms ease",
        }}/>
      </span>
    </button>
  );
}

window.Settings = Settings;
window.useSettings = useSettings;
window.applySettings = applySettings;
window.loadSettings = loadSettings;

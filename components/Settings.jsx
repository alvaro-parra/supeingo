// Pantalla de Configuración — Audio (voz) + Tamaño de elementos.
// Persistencia en localStorage. Se muestra automáticamente la primera vez.
//
// Nota: el volumen se controla desde el sistema operativo. No se expone
// dentro de la app porque era ruido innecesario para un dispositivo de
// uso individual (no se va a hacer otra cosa al mismo tiempo).

const SETTINGS_KEY = "supeingo:settings:v1";

// Lista de todos los tokens cromáticos que la app expone como
// custom properties en :root y en cada paleta. Sirve para dos cosas:
//  1) Iterar en el PaletteInspector y mostrar el desglose.
//  2) Hacer snapshot/limpieza de inline overrides cuando se entra y
//     sale del modo Test (paleta personalizable token-a-token).
// Mantenérsela sincronizada con styles/base.css.
const ALL_PALETTE_TOKENS = [
  "bg", "bg-2", "surface",
  "ink", "ink-soft", "ink-faint", "ink-highlight",
  "primary", "primary-strong",
  "secondary", "secondary-strong",
  "tertiary", "tertiary-soft",
  "ok", "ok-soft",
  "ng", "ng-soft",
];

const SETTINGS_DEFAULTS = {
  voiceURI: null,   // null = auto (la mejor voz española disponible)
  includeDigraphs: true, // incluir CH y LL como letras (enseñanza tradicional)
  hideScary: true, // ocultar palabras con tag "miedo" (araña, serpiente…) — kid-safe por defecto
  // "debug" antes era "ttsDebug" (solo logs de TTS). Ahora es un modo
  // depuración general: TTS log + selector de palabra en Forma palabras.
  debug: false,
  // Paleta de colores activa. null/"" → paleta original (:root).
  // Cualquier otro string se aplica como atributo [data-palette="..."]
  // sobre el documentElement — ver styles/base.css. El valor especial
  // "test" indica modo personalizado: data-palette se setea a "test"
  // y los valores de `testPalette` se inyectan como inline styles.
  palette: null,
  // Overrides token-a-token para el modo Test. {tokenName: "#hex"}.
  // Cuando el usuario hace click en un swatch del inspector y cambia
  // su color, se entra en modo Test y este objeto se llena con un
  // snapshot de los valores actuales más la edición. Cambiar a una
  // paleta no-Test lo vacía.
  testPalette: {},
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
  // Paleta. Si está en modo "test" se setea el atributo y luego se
  // inyectan los overrides como inline styles. En cualquier otro caso
  // se limpian todos los overrides primero (por si veníamos de Test)
  // y se aplica el data-palette correspondiente.
  const root = document.documentElement;
  for (const t of ALL_PALETTE_TOKENS) {
    root.style.removeProperty(`--${t}`);
  }
  if (s.palette === "test") {
    root.setAttribute("data-palette", "test");
    if (s.testPalette) {
      for (const [name, hex] of Object.entries(s.testPalette)) {
        if (hex) root.style.setProperty(`--${name}`, hex);
      }
    }
  } else if (s.palette) {
    root.setAttribute("data-palette", s.palette);
  } else {
    root.removeAttribute("data-palette");
  }
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
          hint="Quita palabras que pueden asustar del pool de juegos y vocabulario."
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
        {/* Selector de paleta — exploración A/B con familias/niños.
            Los nombres son evocativos, no descriptivos, para no
            sesgar qué paleta gusta más. Cambiar la opción redibuja
            toda la app al instante vía atributo data-palette. */}
        <Field label="Paleta" hint="Cambia la combinación de colores de toda la app.">
          <PalettePicker
            current={settings.palette || ""}
            onPick={(p) => {
              // Al volver a una paleta no-Test, limpiamos los
              // overrides personalizados — la idea es que cada
              // paleta sea la fuente de verdad de sus valores.
              if (p !== "test") {
                onChange({ palette: p || null, testPalette: {} });
              } else {
                onChange({ palette: "test" });
              }
            }}
          />
        </Field>
        {/* Inspector con todos los tokens cromáticos de la paleta
            activa. Lee directamente de getComputedStyle(documentElement),
            así que se mantiene sincronizado automáticamente cuando se
            elige otra opción. Útil para verificar qué hace cada
            variable (no solo el trío de identidad). */}
        <Field label="Inspector" hint={settings.palette === "test"
          ? "Modo Test: clic en cualquier color para editarlo. Cambiar a otra paleta resetea."
          : "Todos los tokens cromáticos de la paleta activa. Clic en un color para editarlo (entra en modo Test)."}>
          <PaletteInspector
            paletteKey={settings.palette || ""}
            testKey={JSON.stringify(settings.testPalette || {})}
            onEditToken={(tokenName, newHex) => {
              // Si no estamos en Test ya, tomamos un snapshot de los
              // valores resueltos actuales para que el modo Test arranque
              // visualmente IGUAL que la paleta de partida, y solo difiera
              // en el token que el usuario acaba de cambiar.
              const cs = getComputedStyle(document.documentElement);
              const base = settings.palette === "test"
                ? { ...(settings.testPalette || {}) }
                : Object.fromEntries(
                    ALL_PALETTE_TOKENS.map(t => [t, cs.getPropertyValue(`--${t}`).trim()])
                  );
              base[tokenName] = newHex;
              onChange({ palette: "test", testPalette: base });
            }}
          />
        </Field>
      </Section>

      {/* Modo profesor — link discreto al generador de sopas en PDF.
          Pensado para profes/padres que quieran preparar material
          imprimible. No aparece en Home: la ruta es solo accesible
          desde aquí o desde la URL `?teacher=1`. */}
      {!isFirstTime && (
        <div style={{
          margin: "var(--space-2) var(--space-4) var(--space-5)",
          textAlign: "center",
          position: "relative", zIndex: 2,
        }}>
          <a
            href="?teacher=1"
            onClick={(e) => {
              // Mantén la SPA: navega al query sin recargar.
              e.preventDefault();
              const url = window.location.pathname + "?teacher=1";
              window.history.pushState({}, "", url);
              window.location.assign(url);
            }}
            style={{
              fontSize: "calc(13px * var(--scale))",
              color: "var(--ink-soft)",
              textDecoration: "underline",
              fontWeight: 600,
            }}
          >Modo profesor — preparar sopas en PDF</a>
        </div>
      )}

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
          background: "var(--primary)",
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
  background: "var(--primary)",
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
  background: "var(--tertiary-soft, #FFF6E0)",
  border: "2px solid var(--tertiary, #F4B860)",
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

// ────────────────────────────────────────────────────────────
// PalettePicker — rejilla de swatches para elegir paleta.
//
// Cada opción muestra 3 puntos de color (primary, secondary, tertiary)
// sobre el fondo real de la paleta, y un check ✓ si está activa.
// Estos 3 son los acentos de identidad: aparecen en las ilustraciones
// (GA-TO en Home, MA-ME-MI en Sílabas, A-B-C en El abecedario).
// Los nombres son intencionadamente neutrales / evocativos
// (Mar, Cuaderno, Cobre, Algodón) y NO revelan la intención de
// diseño (más educativa, más visualmente agradable…). Esto evita
// sesgar a la persona que prueba o al niño que mira las opciones.
//
// Los `swatches` aquí están duplicados a mano respecto a los hex
// definidos en styles/base.css. Cambiar la paleta en CSS implica
// actualizar este array para que la previsualización siga siendo
// fiel. Es un coste asumible a cambio de no inyectar style tags
// extra para leer los valores de las custom properties.
// ────────────────────────────────────────────────────────────
const _PALETTES = [
  {
    id: "",
    name: "Original",
    bg:    "#FFF8EE",
    ink:   "#2A2A33",
    dots:  ["#F4978E", "#8E9AAF", "#F4D060"],
  },
  {
    id: "mar",
    name: "Mar",
    bg:    "#EEF6F8",
    ink:   "#1F2A33",
    dots:  ["#7FB6CC", "#8FB59B", "#E5B57A"],
  },
  {
    id: "cuaderno",
    name: "Cuaderno",
    bg:    "#FAFAF7",
    ink:   "#1A1A1A",
    dots:  ["#FFB84D", "#4A90D9", "#9B5BB0"],
  },
  {
    id: "cobre",
    name: "Cobre",
    bg:    "#F9F1E7",
    ink:   "#2E2118",
    dots:  ["#E29577", "#A07A56", "#94A06A"],
  },
  {
    id: "test",
    name: "Test",
    bg:    "#FFFFFF",
    ink:   "#2A2A33",
    // El swatch de Test es decorativo y no representa una paleta
    // concreta: rojo/azul/verde (los 3 acentos arquetipo) para
    // indicar "personalizable". El swatch real lo redibujamos
    // como tres barras inclinadas tipo "rainbow" en el renderizado
    // del PalettePicker (ver isTest).
    dots:  ["#E0584A", "#4A90D9", "#6FB58A"],
    isTest: true,
  },
];

function PalettePicker({ current, onPick }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(86px, 1fr))",
      gap: "var(--space-2)",
      width: "100%",
    }}>
      {_PALETTES.map((p) => {
        const active = (current || "") === p.id;
        return (
          <button
            key={p.id || "original"}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`Paleta ${p.name}`}
            onClick={() => onPick(p.id || null)}
            style={{
              position: "relative",
              padding: "var(--space-2)",
              background: p.bg,
              border: `3px solid ${active ? p.ink : "var(--ink-faint)"}`,
              borderRadius: "var(--r-md)",
              boxShadow: active ? `0 3px 0 ${p.ink}` : "none",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              cursor: "pointer",
              transition: "border-color 120ms ease, box-shadow 120ms ease, transform 120ms ease",
              font: "inherit",
              minHeight: 76,
            }}
            onPointerDown={e => {
              e.currentTarget.style.transform = "translateY(2px)";
              e.currentTarget.style.boxShadow = active ? `0 1px 0 ${p.ink}` : "none";
            }}
            onPointerUp={e => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = active ? `0 3px 0 ${p.ink}` : "none";
            }}
            onPointerLeave={e => {
              e.currentTarget.style.transform = "";
              e.currentTarget.style.boxShadow = active ? `0 3px 0 ${p.ink}` : "none";
            }}
          >
            <span aria-hidden style={{ display: "inline-flex", gap: 4 }}>
              {p.dots.map((c, i) => (
                <span key={i} style={{
                  width: 16, height: 16,
                  background: c,
                  border: `2px solid ${p.ink}`,
                  borderRadius: "50%",
                }}/>
              ))}
            </span>
            <span style={{
              fontSize: "calc(12px * var(--scale))",
              fontWeight: 700,
              fontFamily: "Fredoka, sans-serif",
              color: p.ink,
              lineHeight: 1,
            }}>{p.name}</span>
            {active && (
              <span aria-hidden style={{
                position: "absolute",
                top: -8, right: -8,
                width: 22, height: 22,
                background: p.ink,
                color: p.bg,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 13,
                fontWeight: 800,
                lineHeight: 1,
              }}>✓</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// PaletteInspector — desglose en vivo de los tokens de la paleta
// activa. Lee de getComputedStyle(documentElement), así refleja en
// tiempo real lo que la app está usando — incluso si el CSS cambia
// pero la lista en _PALETTES no se actualiza.
//
// Los tokens están agrupados por ROL FUNCIONAL (no por color), así
// la persona que prueba puede mapear cada token a algo concreto que
// ve en la app. Los títulos van en inglés porque coinciden con los
// nombres convencionales en sistemas de diseño (Material, Tailwind,
// IBM Carbon, etc.) y son más cortos.
//
// Cada token lleva un `role` muy breve que explica EL USO REAL en
// la app (rastreado vía grep). Por ejemplo `primary-strong` no es
// "primary más fuerte" sino que sirve concretamente para el texto
// de marca ("español" del título, letras destacadas).
// ────────────────────────────────────────────────────────────
const _PALETTE_TOKENS = [
  {
    group: "Surface",
    subtitle: "Fondos y superficies",
    tokens: [
      { name: "bg",       role: "Fondo de página" },
      { name: "bg-2",     role: "Chips, badges, decoración" },
      { name: "surface",  role: "Cards, paneles elevados" },
    ],
  },
  {
    group: "Text",
    subtitle: "Colores de texto",
    tokens: [
      { name: "ink",            role: "Texto principal" },
      { name: "ink-soft",       role: "Subtítulos, hints" },
      { name: "ink-faint",      role: "Placeholders, deshabilitado" },
      { name: "ink-highlight",  role: "Letra destacada (El abecedario, LetterHunt)" },
    ],
  },
  {
    group: "Primary",
    subtitle: "Marca principal — card \"Jugar\", sílabas, ilustraciones",
    tokens: [
      { name: "primary",         role: "Rellenos (card, tiles, fondos)" },
      { name: "primary-strong",  role: "Texto de marca (\"español\")" },
    ],
  },
  {
    group: "Secondary",
    subtitle: "Marca secundaria — card \"Aprender\", botones CTA",
    tokens: [
      { name: "secondary",        role: "Rellenos (card, tiles)" },
      { name: "secondary-strong", role: "Fondo de botón primario (Comprobar)" },
    ],
  },
  {
    group: "Tertiary",
    subtitle: "3er acento + fondo de avisos informativos",
    tokens: [
      { name: "tertiary",       role: "3er color de ilustraciones (TO en Jugar, alfabeto)" },
      { name: "tertiary-soft",  role: "Fondo suave (info messages)" },
    ],
  },
  {
    group: "Feedback",
    subtitle: "Estados de respuesta — acierto y error",
    tokens: [
      { name: "ok",         role: "Acierto: borde, iconos" },
      { name: "ok-soft",    role: "Acierto: fondo suave" },
      { name: "ng",         role: "Error: borde, sílaba mal puesta" },
      { name: "ng-soft",    role: "Error: fondo suave" },
    ],
  },
];

function PaletteInspector({ paletteKey, testKey, onEditToken }) {
  // `paletteKey` cambia cuando el usuario elige otra paleta. `testKey`
  // (una serialización de `testPalette`) cambia cuando, dentro del
  // modo Test, el usuario edita un swatch. Ambos en las deps del
  // useEffect garantizan que los swatches del inspector se mantengan
  // siempre sincronizados con los valores reales aplicados al DOM.
  const [resolved, setResolved] = useState({});
  useEffect(() => {
    // Doble rAF: el primer frame deja que React aplique los efectos
    // padre (incluido applySettings que escribe las inline styles en
    // :root); el segundo garantiza que el navegador ya ha computado
    // los valores cuando los leemos. Sin el segundo frame, en algunos
    // browsers vemos los valores ANTERIORES de getComputedStyle.
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const cs = getComputedStyle(document.documentElement);
        const next = {};
        for (const t of ALL_PALETTE_TOKENS) {
          next[t] = cs.getPropertyValue(`--${t}`).trim();
        }
        setResolved(next);
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [paletteKey, testKey]);

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-4)",
      width: "100%",
    }}>
      {_PALETTE_TOKENS.map(g => (
        <div key={g.group}>
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--space-2)",
            marginBottom: 6,
            flexWrap: "wrap",
          }}>
            <span style={{
              fontSize: "calc(13px * var(--scale))",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--ink)",
            }}>{g.group}</span>
            <span style={{
              fontSize: "calc(11px * var(--scale))",
              color: "var(--ink-soft)",
              fontWeight: 500,
            }}>{g.subtitle}</span>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "var(--space-2)",
          }}>
            {g.tokens.map(t => (
              <TokenSwatch
                key={t.name}
                name={t.name}
                hex={resolved[t.name] || ""}
                role={t.role}
                onEdit={onEditToken}/>
            ))}
          </div>
        </div>
      ))}
      <CssPreview resolved={resolved}/>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// CssPreview — bloque pre/textarea con el CSS resultante de la paleta
// activa, en vivo. Sirve a dos propósitos:
//   1. El usuario ve EXACTAMENTE lo que se va a copiar antes de
//      pulsar el botón.
//   2. Si por algún motivo el clipboard API falla (contextos no-
//      secure, permisos), el textarea es seleccionable manualmente
//      con triple-click + Cmd/Ctrl+C, sin necesidad de window.prompt.
//
// El botón "Copiar" vive dentro de este componente para que pueda
// compartir el `text` con el textarea — un solo lugar donde
// construir la cadena.
// ────────────────────────────────────────────────────────────
function CssPreview({ resolved }) {
  const [copied, setCopied] = useState(false);

  const text = useMemo(() => {
    const lines = ALL_PALETTE_TOKENS
      .map(t => `  --${t}: ${resolved[t] || ""};`)
      .join("\n");
    return `:root {\n${lines}\n}\n`;
  }, [resolved]);

  const handleCopy = async () => {
    // Estrategia robusta:
    //   1. Modern Clipboard API. Solo funciona en secure contexts +
    //      iframe con permiso. En el preview puede fallar.
    //   2. Textarea efímero + execCommand("copy"). Deprecated pero
    //      funciona universalmente en iframes y todos los browsers.
    // En cuanto una funcione, declaramos éxito.
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) { /* fall through */ }

    if (!ok) {
      const ta = document.createElement("textarea");
      ta.value = text;
      // Fuera de viewport pero no display:none (algunos browsers no
      // permiten copiar de elementos no renderizados).
      ta.style.position = "fixed";
      ta.style.top = "-9999px";
      ta.style.opacity = "0";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      try {
        ok = document.execCommand("copy");
      } catch (e) { /* fall through */ }
      document.body.removeChild(ta);
    }

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      gap: "var(--space-2)",
      marginTop: "var(--space-2)",
    }}>
      <div style={{
        display: "flex",
        alignItems: "baseline",
        gap: "var(--space-2)",
        flexWrap: "wrap",
      }}>
        <span style={{
          fontSize: "calc(13px * var(--scale))",
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "var(--ink)",
        }}>CSS</span>
        <span style={{
          fontSize: "calc(11px * var(--scale))",
          color: "var(--ink-soft)",
          fontWeight: 500,
        }}>Vista previa en vivo — listo para copiar</span>
      </div>
      {/* Bloque tipo "snippet en docs". El bot\u00f3n de copiar es
          icon-only en la esquina superior-derecha, estilo Google/GitHub.
          El contenido va en <pre><code> para que se vea como c\u00f3digo
          real (no como un textarea). */}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? "Copiado al portapapeles" : "Copiar al portapapeles"}
          title={copied ? "¡Copiado!" : "Copiar"}
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            zIndex: 1,
            width: 32, height: 32,
            background: copied ? "var(--ok-soft)" : "var(--bg-2)",
            border: "1px solid var(--ink-faint)",
            borderRadius: "var(--r-sm)",
            color: copied ? "var(--ok)" : "var(--ink-soft)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            transition: "background 200ms ease, color 200ms ease, border-color 200ms ease",
          }}
          onPointerEnter={e => {
            if (copied) return;
            e.currentTarget.style.background = "var(--surface)";
            e.currentTarget.style.color = "var(--ink)";
            e.currentTarget.style.borderColor = "var(--ink)";
          }}
          onPointerLeave={e => {
            if (copied) return;
            e.currentTarget.style.background = "var(--bg-2)";
            e.currentTarget.style.color = "var(--ink-soft)";
            e.currentTarget.style.borderColor = "var(--ink-faint)";
          }}>
          {copied ? <CheckIcon/> : <CopyIcon/>}
        </button>
        <pre style={{
          margin: 0,
          padding: "var(--space-3)",
          paddingRight: 48,  // hueco para que el bot\u00f3n no tape texto
          background: "var(--surface)",
          border: "2px solid var(--ink-faint)",
          borderRadius: "var(--r-sm)",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: "calc(12px * var(--scale))",
          lineHeight: 1.5,
          color: "var(--ink)",
          overflowX: "auto",
          overflowY: "visible",
          maxHeight: "none",
          userSelect: "text",
          whiteSpace: "pre",
        }}><code>{text}</code></pre>
      </div>
    </div>
  );
}

function TokenSwatch({ name, hex, role, onEdit }) {
  // Un swatch = cuadrado de color + nombre del token + hex en mono +
  // descripción breve del rol. El borde del swatch usa --ink para
  // que swatches casi-blancos sigan siendo legibles contra cualquier
  // fondo.
  //
  // La CARD ENTERA es clickeable cuando hay `onEdit` — al hacer click
  // en cualquier punto (cuadrado, nombre o descripción) se dispara un
  // <input type="color"> oculto y el navegador abre su picker nativo
  // (no es un panel nuestro, es el del SO/navegador). Cada cambio
  // (durante arrastre y al confirmar) notifica al padre vía
  // `onEdit(tokenName, newHex)`. El padre, que vive en Settings.jsx,
  // se encarga de hacer snapshot y entrar en modo Test si no
  // estábamos ya.
  const inputRef = useRef(null);
  const safeHex = hex && /^#[0-9A-Fa-f]{6}$/.test(hex) ? hex : "#000000";
  const Tag = onEdit ? "button" : "div";
  return (
    <Tag
      type={onEdit ? "button" : undefined}
      aria-label={onEdit ? `Editar ${name}` : undefined}
      title={onEdit ? `Click para editar ${name}` : name}
      onClick={onEdit ? () => inputRef.current && inputRef.current.click() : undefined}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--space-2)",
        padding: "var(--space-2)",
        background: "var(--bg-2)",
        border: "2px solid var(--ink-faint)",
        borderRadius: "var(--r-sm)",
        cursor: onEdit ? "pointer" : "default",
        textAlign: "left",
        font: "inherit",
        color: "inherit",
        width: "100%",
      }}>
      <span
        style={{
          width: 36, height: 36,
          background: hex || "transparent",
          border: "2px solid var(--ink)",
          borderRadius: "var(--r-sm)",
          flexShrink: 0,
          marginTop: 2,
          position: "relative",
          display: "block",
        }}>
        {onEdit && (
          <input
            ref={inputRef}
            type="color"
            value={safeHex}
            onInput={e => onEdit(name, e.target.value.toUpperCase())}
            onChange={e => onEdit(name, e.target.value.toUpperCase())}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%", height: "100%",
              opacity: 0,
              cursor: "pointer",
              border: 0,
              padding: 0,
              background: "transparent",
            }}
            tabIndex={-1}
            aria-hidden/>
        )}
      </span>
      <span style={{
        display: "flex",
        flexDirection: "column",
        minWidth: 0,
        gap: 2,
        flex: 1,
      }}>
        <span style={{
          fontSize: "calc(12px * var(--scale))",
          fontWeight: 700,
          fontFamily: "Fredoka, sans-serif",
          color: "var(--ink)",
        }}>--{name}</span>
        <span style={{
          fontSize: "calc(10.5px * var(--scale))",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          color: "var(--ink-soft)",
          whiteSpace: "nowrap",
        }}>{hex || "—"}</span>
        {role && (
          <span style={{
            fontSize: "calc(11px * var(--scale))",
            color: "var(--ink-soft)",
            lineHeight: 1.3,
            marginTop: 2,
          }}>{role}</span>
        )}
      </span>
    </Tag>
  );
}

// ────────────────────────────────────────────────────────────
// CopyIcon — usado por el botón "Copiar al portapapeles" de
// CssPreview. SVG inline, sin emoji, para que se vea idéntico
// en cualquier plataforma.
// ────────────────────────────────────────────────────────────
function CopyIcon() {
  // Estilo Google Material: dos cuadrados solapados, fill negro,
  // no stroke. Más reconocible como "copy" que el outline.
  return (
    <svg viewBox="0 -960 960 960" width={16} height={16} fill="currentColor"
         aria-hidden>
      <path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/>
    </svg>
  );
}

// CheckIcon — usado por el botón Copiar para confirmar visualmente
// la acción inmediatamente después del click.
function CheckIcon() {
  return (
    <svg viewBox="0 -960 960 960" width={16} height={16} fill="currentColor"
         aria-hidden>
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/>
    </svg>
  );
}

window.Settings = Settings;
window.useSettings = useSettings;
window.applySettings = applySettings;
window.loadSettings = loadSettings;
// Helpers visuales reutilizables por TeacherTools.jsx.
window.SettingsUI = { Section, Field, Toggle, selectStyle };

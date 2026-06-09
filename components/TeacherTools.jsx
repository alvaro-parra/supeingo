// "Modo profesor" — generador de sopas de letras en PDF.
//
// Pantalla oculta del flujo del niño. Acceso por `?teacher=1` o el
// link discreto en Settings. Usa la lógica pura de
// `lib/wordsearch-generator.js` y `lib/pdf-spec.js` + `pdf-render.js`.
//
// jsPDF se carga lazy desde CDN al montar — así el bundle del juego
// del niño no carga 200 KB extra. Cuando termina la descarga, se
// guarda en `window.jspdf` (la lib se auto-expone como `jspdf.jsPDF`).

const TT_JSPDF_URL = "https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js";
const TT_DIRS_UI = [
  { id: "E",  arrow: "→", label: "Izquierda → derecha", vec: { dr: 0,  dc: 1 } },
  { id: "S",  arrow: "↓", label: "Arriba → abajo",      vec: { dr: 1,  dc: 0 } },
  { id: "SE", arrow: "↘", label: "Diagonal ↘",          vec: { dr: 1,  dc: 1 } },
  { id: "NE", arrow: "↗", label: "Diagonal ↗",          vec: { dr: -1, dc: 1 } },
  { id: "W",  arrow: "←", label: "Derecha → izquierda", vec: { dr: 0,  dc: -1 } },
  { id: "N",  arrow: "↑", label: "Abajo → arriba",      vec: { dr: -1, dc: 0 } },
  { id: "NW", arrow: "↖", label: "Diagonal ↖",          vec: { dr: -1, dc: -1 } },
  { id: "SW", arrow: "↙", label: "Diagonal ↙",          vec: { dr: 1,  dc: -1 } },
];

const TT_PRESETS = {
  facil:   ["E", "S"],
  clasica: ["E", "S", "SE", "NE"],
  todas:   ["E", "S", "SE", "NE", "W", "N", "NW", "SW"],
};

function loadJsPDF() {
  if (typeof window === "undefined") return Promise.reject(new Error("no-window"));
  if (window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (window.__jsPDFLoading) return window.__jsPDFLoading;
  window.__jsPDFLoading = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = TT_JSPDF_URL;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      if (window.jspdf && window.jspdf.jsPDF) resolve(window.jspdf.jsPDF);
      else reject(new Error("jsPDF se cargó pero no expuso window.jspdf.jsPDF"));
    };
    script.onerror = () => reject(new Error("No se pudo descargar jsPDF desde " + TT_JSPDF_URL));
    document.head.appendChild(script);
  });
  return window.__jsPDFLoading;
}

function TeacherTools({ onBack, settings }) {
  const SUI = window.SettingsUI || {};
  const Section = SUI.Section;
  const Field = SUI.Field;
  const Toggle = SUI.Toggle;
  const dictionary = (window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionary) || [];
  const allCategories = (window.SUPEINGO_CONTENT && window.SUPEINGO_CONTENT.dictionaryCategories) || [];

  // ─── Estado ────────────────────────────────────────────────
  const [categories, setCategories] = useState(["animales"]);
  const [customWords, setCustomWords] = useState("");
  const [rows, setRows] = useState(12);
  const [cols, setCols] = useState(12);
  const [count, setCount] = useState(8);
  const [dirIds, setDirIds] = useState(["E", "S"]);
  const [hideScary, setHideScary] = useState(!!(settings && settings.hideScary));
  const [includeSolution, setIncludeSolution] = useState(true);
  // `board` ya no se recalcula con cada slider — solo al pulsar "Generar".
  // Así la profe puede tocar opciones sin que la preview parpadee a cada
  // cambio (y los Sliders no disparan generación pesada).
  const [board, setBoard] = useState(null);
  const [jspdfReady, setJspdfReady] = useState(!!(window.jspdf && window.jspdf.jsPDF));
  const [jspdfError, setJspdfError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Lazy-load jsPDF al montar.
  useEffect(() => {
    let cancelled = false;
    loadJsPDF()
      .then(() => { if (!cancelled) setJspdfReady(true); })
      .catch((err) => { if (!cancelled) setJspdfError(err.message); });
    return () => { cancelled = true; };
  }, []);

  // ─── Parsear palabras custom ──────────────────────────────
  // Las clasificamos en válidas, formato roto y demasiado largas para
  // poder mostrar mensajes específicos en lugar de un genérico
  // "ignoradas". El límite usa min(rows, cols) — contrato estricto:
  // la palabra cabe en CUALQUIER dirección (horizontal, vertical o
  // diagonal). Así la validación es independiente del set de
  // direcciones que elija la profe; lo que pasa la validación cabrá
  // siempre, sin "Sin sitio" sorpresa tras Generar.
  const parsedCustom = useMemo(() => {
    const maxLen = Math.min(rows, cols);
    const lines = customWords.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    const valid = [];
    const badFormat = [];
    const tooLong = [];
    for (const raw of lines) {
      const u = raw.toUpperCase();
      if (!/^[A-ZÑÁÉÍÓÚ]+$/.test(u) || u.length < 3) {
        badFormat.push(raw);
      } else if (u.length > maxLen) {
        tooLong.push(u);
      } else {
        valid.push({ word: u, syllables: [u], categories: [] });
      }
    }
    return { valid, badFormat, tooLong, maxLen };
  }, [customWords, rows, cols]);

  const customEntries = parsedCustom.valid;

  const dirs = useMemo(
    () => TT_DIRS_UI.filter((d) => dirIds.includes(d.id)).map((d) => d.vec),
    [dirIds]
  );

  // ─── Generar tablero (manual, al pulsar el botón) ─────────
  // Computa los candidatos fresh dentro del handler para evitar el
  // closure stale entre setSeed → useMemo → generate. Las palabras
  // propias son OBLIGATORIAS (priorizadas) y el dict solo rellena el
  // cupo restante. Si no hay categoría seleccionada Y no hay custom,
  // no se genera (fail loud).
  const generate = () => {
    if (dirs.length === 0) {
      setBoard({ error: "Marca al menos una dirección." });
      return;
    }
    const newSeed = Math.floor(Math.random() * 1e9);
    const customForPool = customEntries.slice(0, count);
    const remaining = Math.max(0, count - customForPool.length);
    let freshCandidates;
    if (remaining === 0 || categories.length === 0) {
      freshCandidates = customForPool;
    } else {
      const customSet = new Set(customForPool.map((e) => e.word));
      const fromDict = window.SUPEINGO_WS.pickWords(dictionary, {
        seed: newSeed,
        categories,
        hideScary,
        minLen: 3,
        maxLen: Math.max(rows, cols),
        poolSize: Math.max(remaining * 4, 20),
        requireImage: false,
        allowAccents: true,
      }).filter((e) => !customSet.has(e.word)).slice(0, remaining);
      freshCandidates = customForPool.concat(fromDict);
    }
    if (freshCandidates.length === 0) {
      setBoard({ error: "No hay palabras. Elige una categoría o escribe palabras propias." });
      return;
    }
    try {
      let last = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        last = window.SUPEINGO_WS.generateBoard({
          rows, cols, candidates: freshCandidates, count, dirs,
          seed: newSeed + attempt * 31,
        });
        if (last.warnings.length === 0) break;
      }
      setBoard(last);
    } catch (err) {
      setBoard({ error: err.message });
    }
  };

  const downloadPdf = async () => {
    if (!board || board.error) return;
    setBusy(true);
    try {
      const jsPDF = await loadJsPDF();
      const spec = window.SUPEINGO_PDF_SPEC.buildPdfSpec(board, {
        title: "Sopa de letras",
        includeSolution,
        now: new Date(),
      });
      const doc = window.SUPEINGO_PDF_RENDER.renderPdf(spec, jsPDF);
      doc.save(spec.meta.filename);
    } catch (err) {
      alert("No se pudo generar el PDF: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  const canShareFiles = typeof navigator !== "undefined"
    && typeof navigator.canShare === "function"
    && (() => {
      try {
        const probe = new File(["test"], "x.pdf", { type: "application/pdf" });
        return navigator.canShare({ files: [probe] });
      } catch (_) { return false; }
    })();

  const sharePdf = async () => {
    if (!board || board.error || !canShareFiles) return;
    setBusy(true);
    try {
      const jsPDF = await loadJsPDF();
      const spec = window.SUPEINGO_PDF_SPEC.buildPdfSpec(board, {
        title: "Sopa de letras", includeSolution, now: new Date(),
      });
      const doc = window.SUPEINGO_PDF_RENDER.renderPdf(spec, jsPDF);
      const blob = doc.output("blob");
      const file = new File([blob], spec.meta.filename, { type: "application/pdf" });
      await navigator.share({
        files: [file],
        title: spec.meta.filename,
        text: "Sopa de letras generada con Supeingo",
      });
    } catch (err) {
      // El usuario puede cancelar el share sheet; no es un error real.
      if (err.name !== "AbortError") alert("No se pudo compartir: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  // ─── Validaciones ──────────────────────────────────────
  // Estimación grosera: promedio 5 letras/palabra. Si la suma estimada
  // supera el 60% de las celdas, la generación va apretada. Solo es
  // una advertencia preventiva — el generador hará lo que pueda.
  const avgLen = customEntries.length > 0
    ? customEntries.reduce((a, e) => a + e.word.length, 0) / customEntries.length
    : 5;
  const gridCapacityWarn = (count * avgLen) > rows * cols * 0.6
    ? "Puede quedarse apretado. Sube las dimensiones o baja el nº de palabras."
    : null;
  const dirsEmpty = dirs.length === 0;
  const placedCount = board && !board.error ? board.words.length : 0;
  const canGenerate = !busy && !dirsEmpty
    && (categories.length > 0 || customEntries.length > 0);
  const canDownload = jspdfReady && !busy && board && !board.error
    && placedCount > 0 && !dirsEmpty;

  return (
    <div style={{
      position: "relative", minHeight: "100vh",
      paddingBottom: "var(--space-6)",
      background: "var(--bg)",
    }}>
      <div className="bg-decor"/>
      <ScreenHeader title="Modo profesor — sopa en PDF" onBack={onBack}/>

      <Section title="Contenido" icon={<span style={{ fontSize: 22 }}>✏</span>}>
        <Field label="Categorías" hint="Elige una o varias del diccionario.">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {allCategories.map((cat) => {
              const on = categories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setCategories((cs) => on ? cs.filter((c) => c !== cat) : cs.concat([cat]))}
                  style={chipStyle(on)}
                >{cat}</button>
              );
            })}
          </div>
        </Field>

        <Field label="Palabras propias (opcional)"
               hint="Una por línea, en mayúsculas. Solo letras (Ñ y tildes OK). Largo entre 3 y el nº de columnas.">
          <textarea
            value={customWords}
            onChange={(e) => setCustomWords(e.target.value.toUpperCase())}
            placeholder={"MADRE\nPADRE\nTÍA\nABUELO\nPRIMO"}
            rows={4}
            style={{
              width: "100%",
              padding: "10px 12px",
              background: "var(--bg-2)",
              border: "3px solid var(--ink)",
              borderRadius: "var(--r-md)",
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: "calc(14px * var(--scale))",
              resize: "vertical",
              minHeight: 100,
              color: "var(--ink)",
            }}
          />
          {parsedCustom.badFormat.length > 0 && (
            <div style={{ color: "var(--ng)", fontSize: 12, marginTop: 4 }}>
              Formato no válido (solo letras, mínimo 3): {parsedCustom.badFormat.join(", ")}
            </div>
          )}
          {parsedCustom.tooLong.length > 0 && (
            <div style={{ color: "var(--ng)", fontSize: 12, marginTop: 4 }}>
              Demasiado largas para un tablero {rows}×{cols} (máx {parsedCustom.maxLen} letras): {parsedCustom.tooLong.join(", ")}
            </div>
          )}
        </Field>

        <Field label="Filtros del diccionario">
          {Toggle ? (
            <Toggle
              label="Ocultar palabras que dan miedo"
              hint="Filtra entradas marcadas como araña, serpiente, etc."
              checked={hideScary}
              onChange={setHideScary}
            />
          ) : null}
        </Field>
      </Section>

      <Section title="Tamaño" icon={<span style={{ fontSize: 22 }}>📐</span>}>
        <Field label="Filas">
          <Stepper value={rows} min={7} max={20} onChange={setRows}/>
        </Field>
        <Field label="Columnas">
          <Stepper value={cols} min={7} max={20} onChange={setCols}/>
        </Field>
        <Field label="Número de palabras">
          <Stepper value={count} min={4} max={20} onChange={setCount}/>
        </Field>
        {gridCapacityWarn && (
          <div style={{ color: "var(--ng)", fontWeight: 700, fontSize: 13 }}>
            {gridCapacityWarn}
          </div>
        )}
      </Section>

      <Section title="Direcciones permitidas" icon={<span style={{ fontSize: 22 }}>🧭</span>}>
        <Field label="Presets">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={chipStyle(arraysEqual(dirIds, TT_PRESETS.facil))}
                    onClick={() => setDirIds(TT_PRESETS.facil.slice())}>Fácil</button>
            <button style={chipStyle(arraysEqual(dirIds, TT_PRESETS.clasica))}
                    onClick={() => setDirIds(TT_PRESETS.clasica.slice())}>Clásica</button>
            <button style={chipStyle(arraysEqual(dirIds, TT_PRESETS.todas))}
                    onClick={() => setDirIds(TT_PRESETS.todas.slice())}>Todas las 8</button>
          </div>
        </Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {TT_DIRS_UI.map((d) => {
            const on = dirIds.includes(d.id);
            return (
              <label key={d.id} style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px",
                background: on ? "var(--ok-soft)" : "var(--bg-2)",
                border: "2px solid var(--ink)",
                borderRadius: "var(--r-sm)",
                cursor: "pointer",
              }}>
                <input type="checkbox" checked={on}
                       onChange={(e) => setDirIds((ids) => e.target.checked
                         ? ids.concat([d.id]) : ids.filter((x) => x !== d.id))}
                       style={{ accentColor: "var(--ok)" }}/>
                <span style={{ fontSize: 20, width: 22, textAlign: "center" }}>{d.arrow}</span>
                <span style={{ fontSize: 13 }}>{d.label}</span>
              </label>
            );
          })}
        </div>
        {dirsEmpty && (
          <div style={{ color: "var(--ng)", fontWeight: 700, fontSize: 13 }}>
            Marca al menos una dirección.
          </div>
        )}
      </Section>

      <Section title="Salida" icon={<span style={{ fontSize: 22 }}>📄</span>}>
        {Toggle && (
          <Toggle
            label="Incluir hoja de soluciones"
            hint="Una segunda página con las palabras resaltadas."
            checked={includeSolution}
            onChange={setIncludeSolution}
          />
        )}
      </Section>

      <Section title="Vista previa" icon={<span style={{ fontSize: 22 }}>👁</span>}>
        {!board && (
          <div style={{ color: "var(--ink-soft)" }}>
            Pulsa <strong>Generar</strong> para crear la sopa con la configuración de arriba.
          </div>
        )}
        {board && board.error && (
          <div style={{ color: "var(--ng)" }}>Error: {board.error}</div>
        )}
        {board && !board.error && (
          <>
            <div style={{
              fontSize: 12, color: "var(--ink-soft)",
              marginBottom: 6,
            }}>
              {placedCount}/{count} palabras colocadas
              {board.unplaced && board.unplaced.length > 0 && (
                <> · Sin sitio: {board.unplaced.map((e) => e.word).join(", ")}</>
              )}
              {board.warnings && board.warnings.length > 0 && (
                <> · Avisos: {board.warnings.join(", ")}</>
              )}
            </div>
            <pre style={{
              background: "var(--bg-2)",
              padding: 8,
              border: "2px solid var(--ink-faint)",
              borderRadius: 6,
              fontFamily: "ui-monospace, Menlo, Consolas, monospace",
              fontSize: 13,
              lineHeight: 1.2,
              overflow: "auto",
              maxHeight: 280,
              margin: 0,
            }}>{board.grid.map((row) => row.join(" ")).join("\n")}</pre>
            <div style={{
              marginTop: 8,
              fontSize: 13,
              color: "var(--ink-soft)",
            }}>
              Palabras: {board.words.map((e) => e.word).join(", ")}
            </div>
          </>
        )}
      </Section>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 10,
        justifyContent: "center",
        margin: "var(--space-3) var(--space-4) 0",
        position: "relative", zIndex: 2,
      }}>
        <button
          onClick={generate}
          disabled={!canGenerate}
          title={dirsEmpty
            ? "Marca al menos una dirección"
            : (categories.length === 0 && customEntries.length === 0
                ? "Elige una categoría o escribe palabras propias"
                : "")}
          style={primaryBtnStyle(canGenerate)}
        >
          {board ? "Generar otra" : "Generar"}
        </button>
        <button
          onClick={downloadPdf}
          disabled={!canDownload}
          title={!jspdfReady ? "Cargando jsPDF…" : ""}
          style={secondaryBtnStyle(canDownload)}
        >
          {busy ? "Generando PDF…" : "Descargar PDF"}
        </button>
        {canShareFiles && (
          <button
            onClick={sharePdf}
            disabled={!canDownload}
            style={secondaryBtnStyle(canDownload)}
          >Compartir</button>
        )}
      </div>
      {jspdfError && (
        <div style={{ color: "var(--ng)", textAlign: "center", marginTop: 10 }}>
          jsPDF no se pudo cargar: {jspdfError}
        </div>
      )}
    </div>
  );
}

// Stepper táctil — alternativa a `<input type=range>` para móvil.
// Los slider nativos en móvil cambian de valor al hacer scroll si el dedo
// roza el track, lo que es frustrante. Con botones grandes el cambio es
// siempre explícito.
//
// Soporta hold-to-repeat: tap = 1 paso; mantener pulsado = repite tras
// 380 ms de delay con un tick cada 80 ms. Útil para rangos largos sin
// machacar el botón.
function Stepper({ value, min, max, step = 1, onChange }) {
  const valueRef = useRef(value);
  valueRef.current = value;
  const minRef = useRef(min); minRef.current = min;
  const maxRef = useRef(max); maxRef.current = max;
  const timeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const stepBy = (delta) => {
    const next = Math.min(maxRef.current, Math.max(minRef.current, valueRef.current + delta));
    if (next !== valueRef.current) {
      // Actualizamos valueRef inmediatamente: el setState del padre es
      // asíncrono y el siguiente tick del interval necesita el valor
      // ya incrementado para no quedarse pegado.
      valueRef.current = next;
      onChange(next);
    }
  };

  const stopRepeat = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  };

  const startRepeat = (delta) => {
    stepBy(delta);
    stopRepeat();
    timeoutRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => stepBy(delta), 80);
    }, 380);
  };

  useEffect(() => stopRepeat, []);

  const btn = (enabled) => ({
    width: 44, height: 44,
    background: enabled ? "var(--surface)" : "var(--bg-2)",
    border: "2.5px solid var(--ink)",
    borderRadius: "var(--r-sm)",
    boxShadow: enabled ? "0 2px 0 var(--ink)" : "none",
    fontSize: 22,
    fontWeight: 800,
    fontFamily: "Fredoka, sans-serif",
    cursor: enabled ? "pointer" : "not-allowed",
    color: "var(--ink)",
    lineHeight: 1,
    touchAction: "manipulation",
    userSelect: "none",
    opacity: enabled ? 1 : 0.4,
  });

  const repeatHandlers = (delta) => ({
    onPointerDown: (e) => {
      // preventDefault evita el doble-fire de click + el menú contextual
      // en long-press móvil. Capturamos para recibir pointerup aunque
      // el dedo se salga del botón.
      e.preventDefault();
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
      startRepeat(delta);
    },
    onPointerUp: stopRepeat,
    onPointerLeave: stopRepeat,
    onPointerCancel: stopRepeat,
    onContextMenu: (e) => e.preventDefault(),
  });

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      justifyContent: "flex-start",
    }}>
      <button type="button" aria-label="Disminuir"
              disabled={value <= min}
              style={btn(value > min)}
              {...repeatHandlers(-step)}>−</button>
      <div style={{
        minWidth: 44, textAlign: "center",
        fontSize: 22, fontWeight: 700,
        fontFamily: "Andika, Fredoka, sans-serif",
        color: "var(--ink)",
      }}>{value}</div>
      <button type="button" aria-label="Aumentar"
              disabled={value >= max}
              style={btn(value < max)}
              {...repeatHandlers(step)}>+</button>
      <div style={{
        fontSize: 12,
        color: "var(--ink-faint)",
        marginLeft: 4,
      }}>({min}–{max})</div>
    </div>
  );
}

function chipStyle(on) {
  return {
    padding: "6px 12px",
    background: on ? "var(--primary)" : "var(--bg-2)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    color: "var(--ink)",
  };
}

function primaryBtnStyle(enabled) {
  return {
    padding: "12px 20px",
    background: enabled ? "var(--primary)" : "var(--ink-faint)",
    border: "3px solid var(--ink)",
    borderRadius: "var(--r-md)",
    boxShadow: enabled ? "0 4px 0 var(--ink)" : "none",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "Fredoka, sans-serif",
    cursor: enabled ? "pointer" : "not-allowed",
    color: "var(--ink)",
    minHeight: 48,
  };
}

function secondaryBtnStyle(enabled) {
  return {
    padding: "12px 20px",
    background: "var(--surface)",
    border: "3px solid var(--ink)",
    borderRadius: "var(--r-md)",
    boxShadow: enabled ? "0 4px 0 var(--ink)" : "none",
    fontSize: 16,
    fontWeight: 700,
    fontFamily: "Fredoka, sans-serif",
    cursor: enabled ? "pointer" : "not-allowed",
    color: "var(--ink)",
    minHeight: 48,
    opacity: enabled ? 1 : 0.5,
  };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const aa = a.slice().sort();
  const bb = b.slice().sort();
  for (let i = 0; i < aa.length; i++) if (aa[i] !== bb[i]) return false;
  return true;
}

window.TeacherTools = TeacherTools;

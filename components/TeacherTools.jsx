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
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e9));
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
  const customEntries = useMemo(() => {
    const lines = customWords.split(/\r?\n/).map((s) => s.trim().toUpperCase()).filter(Boolean);
    return lines
      .filter((w) => /^[A-ZÑÁÉÍÓÚ]+$/.test(w) && w.length >= 3 && w.length <= cols)
      .map((w) => ({ word: w, syllables: [w], categories: [] }));
  }, [customWords, cols]);

  const invalidCustom = useMemo(() => {
    const lines = customWords.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
    return lines.filter((w) => {
      const u = w.toUpperCase();
      return !/^[A-ZÑÁÉÍÓÚ]+$/.test(u) || u.length < 3 || u.length > cols;
    });
  }, [customWords, cols]);

  // ─── Pool de candidatos ──────────────────────────────────
  const candidates = useMemo(() => {
    const fromDict = window.SUPEINGO_WS.pickWords(dictionary, {
      seed,
      categories: categories.length > 0 ? categories : null,
      hideScary,
      minLen: 3,
      maxLen: Math.max(rows, cols),
      poolSize: 80,
      requireImage: false,
      allowAccents: true,
    });
    // Custom primero — la profe los escribió a propósito.
    const all = customEntries.concat(fromDict);
    // Dedup por palabra.
    const seen = new Set();
    return all.filter((e) => {
      if (seen.has(e.word)) return false;
      seen.add(e.word);
      return true;
    });
  }, [dictionary, categories, hideScary, seed, customEntries, rows, cols]);

  const dirs = useMemo(
    () => TT_DIRS_UI.filter((d) => dirIds.includes(d.id)).map((d) => d.vec),
    [dirIds]
  );

  // ─── Generar tablero ───────────────────────────────────
  const board = useMemo(() => {
    if (dirs.length === 0) return null;
    if (candidates.length === 0) return null;
    try {
      // Reintentamos hasta 2 veces si vienen warnings — es muy raro
      // pero garantizamos UX sin avisos espurios.
      let last = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        last = window.SUPEINGO_WS.generateBoard({
          rows, cols, candidates, count, dirs, seed: seed + attempt * 31,
        });
        if (last.warnings.length === 0) break;
      }
      return last;
    } catch (err) {
      return { error: err.message };
    }
  }, [rows, cols, candidates, count, dirs, seed]);

  // ─── Acciones ──────────────────────────────────────────
  const regenerate = () => setSeed(Math.floor(Math.random() * 1e9));

  const downloadPdf = async () => {
    if (!board || board.error) return;
    setBusy(true);
    try {
      const jsPDF = await loadJsPDF();
      const subtitle = customEntries.length > 0 ? "personalizada" : (categories[0] || "");
      const spec = window.SUPEINGO_PDF_SPEC.buildPdfSpec(board, {
        title: "Sopa de letras",
        subtitle,
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
      const subtitle = customEntries.length > 0 ? "personalizada" : (categories[0] || "");
      const spec = window.SUPEINGO_PDF_SPEC.buildPdfSpec(board, {
        title: "Sopa de letras", subtitle, includeSolution, now: new Date(),
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
  const totalLetters = candidates.slice(0, count).reduce((acc, e) => acc + e.word.length, 0);
  const gridCapacityWarn = totalLetters > rows * cols
    ? "Cabe muy justo o no cabe. Sube las dimensiones o baja el nº de palabras."
    : null;
  const dirsEmpty = dirs.length === 0;
  const placedCount = board && !board.error ? board.words.length : 0;
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
          {invalidCustom.length > 0 && (
            <div style={{ color: "var(--ng)", fontSize: 12, marginTop: 4 }}>
              Ignoradas (formato no válido): {invalidCustom.join(", ")}
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
        <Field label={`Filas: ${rows}`}>
          <input type="range" min={7} max={20} value={rows}
                 onChange={(e) => setRows(parseInt(e.target.value, 10))}
                 style={{ width: "100%" }}/>
        </Field>
        <Field label={`Columnas: ${cols}`}>
          <input type="range" min={7} max={20} value={cols}
                 onChange={(e) => setCols(parseInt(e.target.value, 10))}
                 style={{ width: "100%" }}/>
        </Field>
        <Field label={`Número de palabras: ${count}`}>
          <input type="range" min={4} max={20} value={count}
                 onChange={(e) => setCount(parseInt(e.target.value, 10))}
                 style={{ width: "100%" }}/>
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
            Configura el contenido para ver la sopa.
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
          onClick={downloadPdf}
          disabled={!canDownload}
          title={!jspdfReady ? "Cargando jsPDF…" : (dirsEmpty ? "Elige al menos una dirección" : "")}
          style={primaryBtnStyle(canDownload)}
        >
          {busy ? "Generando…" : "Descargar PDF"}
        </button>
        {canShareFiles && (
          <button
            onClick={sharePdf}
            disabled={!canDownload}
            style={secondaryBtnStyle(canDownload)}
          >Compartir</button>
        )}
        <button
          onClick={regenerate}
          style={secondaryBtnStyle(true)}
        >Regenerar</button>
      </div>
      {jspdfError && (
        <div style={{ color: "var(--ng)", textAlign: "center", marginTop: 10 }}>
          jsPDF no se pudo cargar: {jspdfError}
        </div>
      )}
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

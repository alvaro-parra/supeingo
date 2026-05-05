// App raíz — gestiona navegación entre Home / Aprender / Jugar / WordBuilder / Settings.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "mascotOn": true,
  "palette": "default"
}/*EDITMODE-END*/;

// Pistas de ayuda extra por pantalla — el niño las dice si pulsas "?"
const HELP_HINTS = {
  home:    "Toca Aprender para ver las letras, o Jugar para formar palabras.",
  learn:   "Toca cualquier letra y la oirás. Cambia entre mayúsculas y minúsculas con los botones de arriba.",
  play:    "Elige un juego. Empieza por Forma palabras, es el más fácil.",
  builder: "Mira la imagen y escucha la palabra. Pulsa las sílabas en orden para formarla.",
};

function App() {
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [settings, updateSettings] = useSettings();
  const [route, setRoute] = useState("home");
  const [prevRoute, setPrevRoute] = useState("home");

  // Aplicar tweaks (paleta) — el tamaño se controla desde settings
  useEffect(() => {
    document.documentElement.dataset.palette = tweaks.palette === "default" ? "" : tweaks.palette;
  }, [tweaks.palette]);

  const goSettings = () => { setPrevRoute(route); setRoute("settings"); };

  let screen;
  if (route === "settings") {
    screen = <Settings
      settings={settings}
      onChange={updateSettings}
      onDone={() => setRoute(prevRoute)}
      isFirstTime={false}
    />;
  } else if (route === "home") {
    screen = <Home onNav={setRoute} mascotOn={tweaks.mascotOn} onSettings={goSettings}/>;
  } else if (route === "learn") {
    screen = <LearnArea onBack={() => setRoute("home")}/>;
  } else if (route === "play") {
    screen = <PlayMenu onBack={() => setRoute("home")} onPick={(id) => {
      if (id === "builder") setRoute("builder");
    }}/>;
  } else if (route === "builder") {
    screen = <WordBuilder onBack={() => setRoute("play")}/>;
  }

  const showChrome = route !== "settings";

  return (
    <>
      <div className="app-shell">{screen}</div>
      {showChrome && tweaks.mascotOn && <HelpButton hint={HELP_HINTS[route]}/>}
      <SupeingoTweaks tweaks={tweaks} setTweak={setTweak} settings={settings} updateSettings={updateSettings}/>
      <TTSDebugPanel enabled={!!settings.ttsDebug}/>
    </>
  );
}

function SupeingoTweaks({ tweaks, setTweak, settings, updateSettings }) {
  return (
    <TweaksPanel title="Tweaks">
      <TweakSection label="Accesibilidad">
        <TweakRadio
          label="Paleta"
          value={tweaks.palette}
          options={[
            { value: "default", label: "Suave" },
            { value: "hi-contrast", label: "Alto contraste" },
            { value: "tritan", label: "Daltonismo azul-amarillo" },
          ]}
          onChange={v => setTweak("palette", v)}
        />
        <TweakSlider
          label="Tamaño de elementos"
          value={settings.scale}
          min={0.9} max={1.4} step={0.05}
          onChange={v => updateSettings({ scale: v })}
        />
      </TweakSection>

      <TweakSection label="Apariencia">
        <TweakToggle
          label="Mostrar al niño guía"
          value={tweaks.mascotOn}
          onChange={v => setTweak("mascotOn", v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App/>);

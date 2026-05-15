// App raíz — gestiona navegación entre Home / Aprender / Jugar / WordBuilder / Settings.

// Pistas de ayuda extra por pantalla — el niño las dice si pulsas "?".
// Si una ruta no aparece aquí, el botón de ayuda no se muestra (la
// pantalla se considera lo bastante autoexplicativa).
const HELP_HINTS = {
  builder: "Mira la imagen y escucha la palabra. Pulsa las sílabas en orden para formarla.",
  find:    "Mira las sílabas y escucha la palabra. Toca el dibujo que coincide.",
  memory:  "Voltea dos cartas y busca las que son iguales.",
  search:  "Mira los dibujos de arriba. Arrastra o toca dos celdas para encontrar la palabra.",
  guess:   "Forma la palabra con las sílabas. Pulsa la 🔍 si necesitas una pista.",
};

function App() {
  const [settings, updateSettings] = useSettings();
  const [route, setRoute] = useState("home");
  const [prevRoute, setPrevRoute] = useState("home");

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
    screen = <Home onNav={setRoute} helperOn={true} onSettings={goSettings}/>;
  } else if (route === "learn") {
    screen = <LearnArea onBack={() => setRoute("home")}/>;
  } else if (route === "play") {
    screen = <PlayMenu onBack={() => setRoute("home")} onPick={(id) => {
      if (id === "builder") setRoute("builder");
      else if (id === "find") setRoute("find");
      else if (id === "memory") setRoute("memory");
      else if (id === "search") setRoute("search");
      else if (id === "guess") setRoute("guess");
    }}/>;
  } else if (route === "builder") {
    screen = <WordBuilder onBack={() => setRoute("play")} debug={!!settings.debug}/>;
  } else if (route === "find") {
    screen = <FindPicture onBack={() => setRoute("play")} debug={!!settings.debug}/>;
  } else if (route === "memory") {
    screen = <Memory onBack={() => setRoute("play")} debug={!!settings.debug}/>;
  } else if (route === "search") {
    screen = <WordSearch onBack={() => setRoute("play")} debug={!!settings.debug} hideScary={!!settings.hideScary}/>;
  } else if (route === "guess") {
    screen = <GuessWord onBack={() => setRoute("play")} debug={!!settings.debug}/>;
  }

  const showChrome = route !== "settings";

  return (
    <>
      <div className="app-shell">{screen}</div>
      {showChrome && HELP_HINTS[route] && <HelpButton hint={HELP_HINTS[route]}/>}
      <TTSDebugPanel enabled={!!settings.debug}/>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("app"));
root.render(<App/>);

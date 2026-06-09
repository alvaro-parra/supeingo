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
  letters: "Mira el dibujo. Pulsa la letra que falta en la palabra.",
};

function App() {
  const [settings, updateSettings] = useSettings();
  // Acceso oculto al "Modo profesor" vía ?teacher=1. Pensado para profes
  // que marcan la URL como favorito y entran directamente al generador.
  const initialRoute = (() => {
    try {
      const qs = new URLSearchParams(window.location.search);
      if (qs.get("teacher") === "1") return "teacher";
    } catch (_) {}
    return "home";
  })();
  const [route, setRoute] = useState(initialRoute);
  const [prevRoute, setPrevRoute] = useState(initialRoute);

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
      else if (id === "letters") setRoute("letters");
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
  } else if (route === "letters") {
    screen = <LetterHunt onBack={() => setRoute("play")} debug={!!settings.debug}/>;
  } else if (route === "teacher") {
    screen = <TeacherTools onBack={() => {
      // Al salir, limpiamos el query para no quedar atrapados en el modo.
      try {
        const url = window.location.pathname;
        window.history.replaceState({}, "", url);
      } catch (_) {}
      setRoute("home");
    }} settings={settings}/>;
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

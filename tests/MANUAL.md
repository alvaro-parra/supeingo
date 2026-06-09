# Pruebas manuales — Supeingo

`node --test tests/*.test.js` cubre la lógica pura (generador + spec PDF).
La UI React + Babel-in-browser no es testeable sin levantar un runner
con jsdom; este documento lista los checks que se ejecutan a mano.

## Setup

```bash
python3 -m http.server 8765
# o el servidor que prefieras
```

Abrir `http://localhost:8765/`.

## 1. Juego del niño no ha cambiado

El refactor de `WordSearch.jsx` extrajo la lógica a
`lib/wordsearch-generator.js`. La pantalla del niño debe seguir
**idéntica** a antes:

- [ ] Home → "Jugar" → "Sopa de letras" abre la pantalla "Animales".
- [ ] Aparecen 4 palabras en una rejilla 2×2 arriba.
- [ ] Cuadrícula 8×7 abajo.
- [ ] Arrastre selecciona celdas; soltar sobre una palabra colocada
      la marca como encontrada con feedback (confetti + voz).
- [ ] Tap-tap (dos taps en celdas opuestas de una palabra) también
      funciona.
- [ ] Encontrar las 4 palabras lleva a la pantalla "¡Sesión completa!".
- [ ] "Jugar de nuevo" reinicia con una semilla nueva.

## 2. Modo profesor — acceso

- [ ] Visitar `/?teacher=1` abre la pantalla "Modo profesor — sopa en PDF".
- [ ] Visitar `/` no muestra ningún botón ni rastro del modo profesor.
- [ ] En Ajustes (⚙ desde Home) aparece al final un link discreto
      "Modo profesor — preparar sopas en PDF" que abre la misma
      pantalla.
- [ ] Pulsar "Atrás" desde el modo profesor vuelve a Home y limpia el
      `?teacher=1` de la URL.

## 3. Modo profesor — formulario y preview

Con la pantalla cargada:

- [ ] La sección "Categorías" muestra los nombres del diccionario
      (animales, comida, hogar, etc.). Click sobre uno lo conmuta.
- [ ] La textarea de palabras propias acepta mayúsculas y guiona
      los errores (palabras con caracteres no válidos aparecen
      listadas como "Ignoradas").
- [ ] Los sliders de filas, columnas y nº de palabras cambian la
      sopa en vivo.
- [ ] Los presets "Fácil" / "Clásica" / "Todas las 8" actualizan
      la lista de direcciones marcadas.
- [ ] Desmarcar todas las direcciones deshabilita "Descargar PDF"
      (tooltip explicativo).
- [ ] El toggle "Ocultar palabras que dan miedo" filtra el pool.
- [ ] La vista previa en `<pre>` muestra el grid actual; debajo
      aparece la lista de palabras colocadas y, si las hay,
      `Sin sitio: …` con las palabras que no encajaron.

## 4. Descargar PDF

- [ ] Con configuración por defecto (animales, 12×12, 8 palabras,
      preset Fácil, soluciones ON), "Descargar PDF" baja
      `supeingo-sopa-animales-{fecha}.pdf`.
- [ ] El PDF tiene 2 páginas: sopa + soluciones.
- [ ] La página 1 contiene el título, el grid impreso con fuente
      monoespaciada, y la lista "Encuentra estas palabras:" en
      columnas.
- [ ] La página 2 contiene el mismo grid con las palabras
      colocadas en negrita, y la lista
      "PALABRA — fila X col Y → fila Z col W".
- [ ] Escribir 5 palabras custom en la textarea
      (`MADRE\nPADRE\nTIA\nABUELO\nPRIMO`) y descargar →
      el PDF las incluye junto a las del diccionario.

## 5. Compartir (móvil HTTPS)

- [ ] En desktop el botón "Compartir" no aparece (o aparece
      deshabilitado).
- [ ] En móvil sobre HTTPS, "Compartir" abre la share sheet del
      SO con el archivo PDF; el usuario puede enviarlo por mail,
      WhatsApp, etc.
- [ ] Cancelar la share sheet no produce error visible.

## 6. Regenerar

- [ ] "Regenerar" cambia la semilla; el grid cambia pero los
      parámetros (rows, cols, dirs, count, categorías) no.

## 7. Carga lazy de jsPDF

- [ ] Visitar Home en una pestaña limpia: las DevTools NO muestran
      una petición a `unpkg.com/jspdf*`.
- [ ] Visitar `/?teacher=1`: se carga `unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js`.
- [ ] Si el CDN está bloqueado, aparece un mensaje en rojo
      "jsPDF no se pudo cargar: …" y el botón "Descargar PDF"
      sigue deshabilitado.

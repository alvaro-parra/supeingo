# Supeingo — Aprendo Español

App educativa para que niños de 4+ años aprendan español. Mock interactivo HTML+JSX, sin backend, sin coste.

> Versión 0.4 · Mock MVP en construcción.

---

## 1. Contexto del producto

| Campo | Detalle |
|---|---|
| **Público objetivo** | Niños a partir de 4 años, hablantes no nativos de español |
| **Mercado prioritario** | Internacional (enfoque inicial: Japón) |
| **Objetivo pedagógico** | Reconocer letras (mayúsculas/minúsculas) → leer sílabas → dividir palabras → leer palabras completas |
| **Dispositivos** | PC y tablet · Solo ratón/táctil · Sin gestos complejos |

### Problema pedagógico central

Aplicación para enseñar español como lengua extranjera a niños pequeños:

- Progresión natural de aprendizaje: letras → sílabas → palabras
- Diferenciación entre mayúsculas y minúsculas
- Contenido 100% en español con apoyo visual (imágenes, emojis, iconos)
- Mecánicas adaptadas a capacidades motrices y cognitivas de 4+ años

---

## 2. Estado actual del prototipo

### Implementado
- **Pantalla Home** con dos áreas (Aprender / Jugar) y acceso a Ajustes (⚙️)
- **Aprender → Letras**: cuadrícula del abecedario completo (A–Z, Ñ, opcionalmente CH y LL), toggle mayúsculas/minúsculas, panel de detalle con palabra-ejemplo + emoji, audio "X, de Y" (p.ej. "a, de abeja", "i griega, de yoyó", "elle, de llave")
- **Aprender → Sílabas básicas**: tablero de familias silábicas (consonante + vocal) para todas las consonantes B–Z, con dígrafos opcionales (CH, LL) y excepciones tradicionales (Q → QUE, QUI)
- **Jugar → Forma la palabra (Constructor de palabras)**: mecánica core. Sesión de 10 palabras barajadas, slots vacíos + sílabas-ficha desordenadas, auto-avance tras acierto, lista creciente de "Tu colección" y pantalla final con trofeo
- **Ajustes**: voz preferida, volumen, escala global de la interfaz, toggle "Incluir CH y LL" (enseñanza tradicional). Persistencia en `localStorage`. Cambios en directo (sin botón Guardar).
- **Audio**: Web Speech API con normalización (minúsculas, sin marcas de silabeo), warm-up al primer gesto + promesa `whenTTSReady()` para que la primera palabra de cada sesión salga limpia, mapeo `spell` por letra para pronunciaciones especiales (Y → "i griega", CH → "che", LL → "elle").

### Pendiente / próximos pasos
- **Aprender → Vocabulario**: pendiente. Categorías (animales, comida, etc.) con audio.
- **Reglas avanzadas de separación silábica**: ampliación del área de Sílabas con diptongos, triptongos, hiatos y sílabas trabadas (ver §5).
- **Más mecánicas de juego**: ver §5.
- **Sistema de progreso/recompensas** persistente entre sesiones (estrellas por palabra, etc.).

---

## 3. Estructura de navegación

La pantalla principal (Home) es siempre la primera vista. Desde el Home se accede a:

### Área de Aprendizaje
Contenido exploratorio para revisar y familiarizarse:
- **Letras** — abecedario completo (mayúsculas y minúsculas), con o sin dígrafos CH/LL.
- **Sílabas básicas** — combinaciones consonante + vocal para B–Z.
- **Vocabulario** *(próximamente)* — categorías temáticas (animales, comida, colores…).

### Área de Juegos
Mecánicas interactivas para practicar lo aprendido (ver §5).

### Pantalla de Ajustes
Accesible desde un botón ⚙️ en el Home (no se muestra automáticamente al iniciar). Permite configurar:
- **Audio**: voz preferida (lista de voces TTS del sistema) y volumen
- **Tamaño de elementos**: escala global de la interfaz
- **Aprendizaje**: incluir CH y LL como letras (enseñanza tradicional, ON por defecto)

---

## 4. Estructura de archivos

```
index.html            ← entrada principal
components/
  App.jsx             ← root, navegación, tweaks
  Home.jsx            ← pantalla inicial
  LearnArea.jsx       ← submenú Letras / Sílabas básicas / (Vocabulario próximamente)
  PlayMenu.jsx        ← submenú de juegos
  WordBuilder.jsx     ← mecánica core (forma palabras con sílabas, sesión de 10)
  Settings.jsx        ← pantalla Ajustes (audio + tamaño + aprendizaje)
  shared.jsx          ← Helper, HelperHint, speak() + warm-up TTS, helpers comunes
styles/
  base.css            ← tokens de diseño (colores, escalas, paletas)
data/
  content.js          ← abecedario, palabras, familias silábicas
tweaks-panel.jsx      ← panel de tweaks (toolbar in-page, oculto en producción)
```

### Pipeline de imágenes (`assets/img/*.webp`)

Para palabras sin emoji adecuado, generamos PNG 1024² con alpha (ChatGPT u otra fuente) y los procesamos así:

```bash
sips -Z 256 origen.png                          # redimensiona a 256² in-place
cwebp -q 85 origen.png -o assets/img/foo.webp   # PNG → WebP (~10–20 KB)
```

Luego se referencia desde `data/dictionary.js` con `image: "img/foo.webp"`. `image` tiene prioridad sobre `svg` y `emoji`.

---

## 5. Banco de ideas — mecánicas y contenidos futuros

> Lista de mecánicas y módulos propuestos. No todos se implementarán en el MVP.

### Mecánicas de juego propuestas

| Mecánica | Descripción | Interacción | Estado |
|---|---|---|---|
| **Constructor de palabras** | Ordenar sílabas para formar palabra | Reordenación | ✅ Implementado |
| **Fábrica de sílabas** | Dividir palabra en bloques silábicos | Arrastre de bloques | Pendiente |
| **Juego de memoria** | Voltear cartas y emparejar pares iguales | Clic en cartas | Pendiente |
| **Sopa de letras** | Buscar palabras escondidas en cuadrícula | Arrastre sobre letras | Pendiente |
| **Crucigrama ilustrado** | Pista visual (imagen); completar palabra | Selección de opciones | Pendiente |
| **Emparejar** | Conectar imagen con su palabra | Clic o arrastre | Pendiente |
| **Laberinto** | Trazar camino correcto entre opciones | Arrastre o clic en dirección | Pendiente |
| **Rellena el hueco** | Palabra incompleta; elegir sílaba/letra correcta | Clic en opción | Pendiente |
| **Tren de letras** | Abecedario interactivo con audio | Clic en letra | (Cubierto por Letras) |
| **Dictado visual** | Escuchar palabra y seleccionar opción correcta | Clic en opción | Pendiente |

### Contenidos pedagógicos futuros

- **Reglas de separación silábica**: profundizar en cómo se dividen las palabras en sílabas según la fonotáctica del español. Casos a cubrir:
  - **Diptongos** (combinaciones vocal abierta + cerrada o dos cerradas que forman una sola sílaba: *ai, ei, oi, au, eu, ou, ia, ie, io, ua, ue, uo, iu, ui*).
  - **Triptongos** (vocal cerrada + abierta + cerrada en una sola sílaba: *iai, iei, uai/uay, uei/uey, uau, ioi*).
  - **Hiatos** (dos vocales que pertenecen a sílabas distintas: *pa-ís, le-er, ca-os*).
  - **Sílabas trabadas** (consonante + L o R: *bla, bre, cla, cri, dro, fla*…).
  - **Reglas posicionales** (consonante intervocálica → siguiente sílaba; dos consonantes → una a cada sílaba salvo trabadas; tres consonantes → dos+una o una+dos según trabada; etc.).
  - **Dígrafos indivisibles** (ch, ll, rr, qu, gu se mantienen unidos).
  - **Excepciones de pronunciación** (CE/CI suaves, GE/GI suaves, GUE/GUI con U muda, GÜE/GÜI con diéresis, H muda).
- **Vocabulario por categorías** (animales, comida, familia, números, colores, partes del cuerpo, ropa…).
- **Frases sencillas y saludos** (hola, buenos días, gracias…).
- **Conjugación verbal básica** (presente de indicativo de verbos regulares).

---

## 6. Requisitos técnicos

### Pila técnica del mock

Mock con **el mínimo posible** para iterar rápido:

- **React 18** + **ReactDOM** cargados desde CDN
- **Babel standalone** que transforma JSX en el navegador (no hay build step)
- **Sin npm, sin bundler, sin TypeScript**
- Componentes globales (`window.Foo`) para compartir entre archivos `.jsx`
- Routing manual: `useState("home")` + `if/else` en `App.jsx`

Ideal para diseñar; **no es producción**. Carga inicial lenta porque Babel compila en cada visita.

### No funcionales — Must
- **Coste cero**: hosting estático gratuito (GitHub Pages, Netlify, Vercel, etc.)
- **Sin servidor**: aplicación completamente en cliente (HTML/CSS/JS estático)
- **Sin dependencias de pago**: no usar APIs, servicios o recursos externos que requieran tarjeta de crédito
- **Persistencia local**: progreso y ajustes en `localStorage`
- **Solo clic y arrastre simple** (sin doble clic, gestos complejos, ni zoom)
- **Sin teclado** para la mayoría de mecánicas

### No funcionales — Should
- Funciona offline una vez cargada (caché del navegador)
- Opción alternativa de deployment en Synology NAS (Docker + Nginx Alpine) si se necesita
- Animaciones de feedback cortas para mantener atención
- Paleta de colores vivos y ayudante guía
- Diseño visual coherente entre todas las mecánicas

### No funcionales — Could (futuras iteraciones)
- Modo pantalla completa
- Panel de progreso para padres/profesores
- Selector de perfil múltiple
- Soporte multiidioma (japonés con hiragana, otros idiomas)
- Sustituir Web Speech API por audios pregrabados (Piper TTS, Edge TTS Neural) para garantizar consistencia entre dispositivos

### Restricciones de diseño e interacción — Must
- Interfaz apta para niños de 4 años (texto grande, iconos claros, instrucciones mínimas)
- Áreas táctiles ≥ 44 px
- Contenido en español únicamente
- Apoyo visual constante (imágenes, emojis, iconos)
- Audio con pronunciación en español

### Restricciones — Should
- Feedback visual y sonoro inmediato (correcto/incorrecto)
- Sistema simple de recompensas (estrellas, badges, etc.)
- Banco de contenido (palabras, imágenes, sílabas) en ficheros JSON separados del código

---

## 7. Audio

Solo Web Speech API (TTS del navegador/sistema). La voz preferida y el volumen se configuran desde la pantalla **Ajustes** (botón ⚙️ del Home). Persiste en `localStorage`.

Para producción, valoraría sustituir el TTS por audios pregrabados generados con **Piper TTS** (offline, gratis) o **Edge TTS Neural**, para garantizar que todos los dispositivos suenen igual.

---

## 8. Despliegue

### Demo en vivo (GitHub Pages — Fase 1, zero build)

Cualquiera puede abrir el `index.html` directamente o publicarlo en GitHub Pages como página estática.

1. Crea un repositorio nuevo en GitHub (ej. `supeingo`).
2. Sube el contenido de este proyecto:
   ```bash
   git add .
   git commit -m "Mock inicial"
   git remote add origin https://github.com/<TU_USUARIO>/supeingo.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages**
   - Source: **Deploy from a branch**
   - Branch: **main** / folder: **/ (root)**
   - Guardar
4. Espera 1-2 minutos. Tu app estará en:
   `https://<TU_USUARIO>.github.io/supeingo/`

### Migración a producción (Vite + React + TypeScript)

Cuando quieras pulir y desplegar de verdad:

```bash
# Pídeselo a Claude Code:
# "Migra este mock a Vite + React + TypeScript.
#  Conserva la estructura de componentes y estilos CSS.
#  Sustituye el routing manual por React Router.
#  Convierte window.X = Component a imports ES modules."
```

Para Pages con Vite necesitas:

1. En `vite.config.ts`:
   ```ts
   export default defineConfig({
     base: "/supeingo/",  // nombre del repo
     plugins: [react()],
   })
   ```

2. GitHub Action de deploy automático en `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy
   on:
     push: { branches: [main] }
   permissions:
     contents: read
     pages: write
     id-token: write
   jobs:
     build:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with: { node-version: 20 }
         - run: npm ci
         - run: npm run build
         - uses: actions/upload-pages-artifact@v3
           with: { path: dist }
     deploy:
       needs: build
       runs-on: ubuntu-latest
       environment: { name: github-pages }
       steps:
         - uses: actions/deploy-pages@v4
   ```

3. Settings → Pages → Source: **GitHub Actions**

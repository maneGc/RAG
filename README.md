# RAG · Pregunta a tus documentos

Aplicación de **Retrieval-Augmented Generation (RAG)** que responde preguntas sobre un conjunto de documentos (PDF, TXT y Markdown), muestra las **fuentes** que usó y **reconoce cuando no tiene información suficiente**.

Los documentos de ejemplo son reglamentos de una escuela **ficticia** (Instituto Tecnológico Valle Sereno, ITVS). Se usan datos inventados a propósito: así se demuestra que el modelo responde con lo que recupera de los documentos y no con lo que ya sabía.

| Componente | Tecnología |
|---|---|
| Lenguaje / servidor | Node.js 20+ y Express |
| Extracción de PDF | `unpdf` |
| Chunking | Divisor recursivo propio (párrafo → línea → oración → palabra), 700 caracteres con 120 de solapamiento |
| Embeddings | `paraphrase-multilingual-MiniLM-L12-v2` (384 dimensiones), local con `@huggingface/transformers` (ONNX) |
| Base vectorial | Base vectorial local propia (JSON + similitud coseno, índice plano) |
| LLM | Claude (API de Anthropic) **u** Ollama (local) |
| Interfaz | HTML + JavaScript |

## Documentación

- [docs/INVESTIGACION.md](docs/INVESTIGACION.md): las seis técnicas para ampliar el conocimiento de un modelo, la tabla comparativa y las conclusiones.
- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): arquitectura y flujo del RAG, chunking, embeddings, búsqueda semántica y resultados de las pruebas.
- [public/presentacion.html](public/presentacion.html): presentación con la demo integrada (se abre con la app encendida en `http://localhost:3000/presentacion.html`).

## Requisitos

- [Node.js](https://nodejs.org) 20 o superior
- Un LLM, cualquiera de estas opciones:
  - **Claude**: una API key de [console.anthropic.com](https://console.anthropic.com)
  - **Ollama** (gratis y local): instala [Ollama](https://ollama.com) y ejecuta `ollama pull llama3.2`
  - Sin LLM: la app funciona igual, pero solo muestra el fragmento más relevante (sirve para probar la recuperación)

## Instalación y ejecución

Descarga el proyecto y entra a su carpeta:

```bash
git clone https://github.com/maneGc/RAG.git
```

```bash
cd RAG
```

Instala las dependencias:

```bash
npm install
```

Configura el LLM: copia `.env.example` como `.env` y descomenta una opción.

```bash
cp .env.example .env
```

Indexa los documentos (extracción → chunking → embeddings → base vectorial). La primera vez se descarga el modelo de embeddings (~120 MB):

```bash
npm run ingest
```

Inicia la aplicación y abre http://localhost:3000:

```bash
npm start
```

## Presentación con demo en vivo

Con la app encendida, abre http://localhost:3000/presentacion.html. Son 23 diapositivas (partes 1, 3 y 4), y la 17 tiene una caja de preguntas conectada al RAG.

- **→ / Espacio / Re Pág**: siguiente. **← / Av Pág**: anterior.
- **F**: pantalla completa. **N**: notas del expositor. **D**: ir directo a la demo.
- Mientras escribes en la caja de la demo, las flechas no cambian de diapositiva. **Esc** sale de la caja.

## Otros comandos

Preguntar desde la terminal:

```bash
npm run preguntar -- "¿Cuánto cuesta un examen extraordinario?"
```

Ejecutar la batería de pruebas (13 preguntas que sí están en los documentos y 5 que no):

```bash
npm run evaluar
```

Probar solo la recuperación, sin gastar llamadas al LLM:

```bash
npm run evaluar -- --solo-busqueda
```

Regenerar el PDF de ejemplo:

```bash
npm run generar-pdf
```

## Usar tus propios documentos

Coloca tus archivos `.pdf`, `.txt` o `.md` en la carpeta `documentos/` y vuelve a ejecutar `npm run ingest`. Si cambias de tema, ajusta también el texto del `SYSTEM_PROMPT` en `src/rag.js`.

## Estructura del proyecto

```
documentos/            6 documentos de ejemplo (4 .md, 1 .txt, 1 .pdf)
src/
  config.js            parámetros (tamaño de chunk, top-k, umbral, modelos)
  loaders.js           PASO 1: lectura y extracción de texto (PDF/TXT/MD)
  chunker.js           PASO 2: división en fragmentos con solapamiento
  embeddings.js        PASO 3: texto → vector (384 dimensiones)
  vectorStore.js       PASO 4: base vectorial y búsqueda por similitud coseno
  rag.js               PASO 5-6: recuperación + prompt + generación
  llm.js               conexión con Claude u Ollama
  ingest.js            script de indexación
  server.js            API web (Express)
  preguntar.js         CLI para preguntar
  evaluar.js           pruebas automáticas
  pruebas.js           las 18 preguntas de prueba y el dato esperado de cada una
public/index.html      interfaz web
docs/                  investigación, arquitectura y guion de la exposición
```

## ¿Cómo detecta que no tiene información?

Usa dos capas:

1. **Umbral de similitud (`MIN_SCORE`, 0.35 por defecto).** Si ningún fragmento se parece lo suficiente a la pregunta (por ejemplo, "¿Cuál es la capital de Francia?" → 0.16), la app responde "No tengo información suficiente…" **sin llamar al LLM**.
2. **Instrucción al LLM.** Si la pregunta es del mismo tema pero el dato no existe (por ejemplo, "¿Cuánto gana el director?"), los fragmentos sí pasan el umbral, pero el *system prompt* obliga al modelo a responder con la frase exacta de "no tengo información" cuando el contexto no contiene la respuesta.

## Problemas comunes

- **`No existe la base vectorial`**: ejecuta `npm run ingest` antes de `npm start`.
- **Error al cargar el modelo en Windows**: el modelo se guarda en `~/.cache/rag-app-models` para evitar el límite de 260 caracteres de las rutas de Windows. Puedes cambiar esa ruta con `MODELS_DIR` en `.env`.
- **`No se pudo conectar con Ollama`**: abre la aplicación Ollama y verifica que exista el modelo con `ollama list`.

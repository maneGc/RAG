// Servidor web: expone la API del RAG y la interfaz en http://localhost:3000
// Uso: npm start
import express from "express";
import { config } from "./config.js";
import { VectorStore } from "./vectorStore.js";
import { ask } from "./rag.js";
import { embed } from "./embeddings.js";
import { llmDescription } from "./llm.js";

const store = VectorStore.load(config.storePath);
await embed(["calentando el modelo"]); // carga el modelo de embeddings antes de la primera pregunta

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Información general (para mostrar en la interfaz)
app.get("/api/info", (_req, res) => {
  res.json({
    llm: llmDescription(),
    proveedor: config.llmProvider,
    topK: config.topK,
    minScore: config.minScore,
    ...store.stats(),
  });
});

// Lista de fragmentos (para explicar el chunking en la exposición)
app.get("/api/fragmentos", (req, res) => {
  const doc = req.query.doc;
  res.json(
    store.items
      .filter((it) => !doc || it.source === doc)
      .map(({ embedding, ...it }) => ({ ...it, vector: embedding.slice(0, 8), dimensiones: embedding.length })),
  );
});

// Pregunta → respuesta con fuentes
app.post("/api/preguntar", async (req, res) => {
  const pregunta = String(req.body?.pregunta ?? "").trim();
  if (!pregunta) return res.status(400).json({ error: "Escribe una pregunta." });
  const topK = Math.min(Math.max(Number(req.body.topK) || config.topK, 1), 10);
  const minScore = req.body.minScore !== undefined ? Number(req.body.minScore) : config.minScore;
  try {
    res.json(await ask(store, pregunta, { topK, minScore }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(config.port, () => {
  const s = store.stats();
  console.log(`RAG listo: ${s.documentos} documentos, ${s.fragmentos} fragmentos | LLM: ${llmDescription()}`);
  console.log(`Abre http://localhost:${config.port}`);
});

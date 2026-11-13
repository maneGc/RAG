// Configuración central de la aplicación RAG.
// Todos los valores se pueden cambiar con variables de entorno (archivo .env).
import os from "node:os";
import path from "node:path";

const num = (v, d) => (v === undefined || v === "" ? d : Number(v));

export const config = {
  // Carpeta con los documentos fuente (PDF, TXT, MD)
  docsDir: process.env.DOCS_DIR || "documentos",
  // Archivo donde se guarda la base vectorial
  storePath: process.env.STORE_PATH || "data/vectorstore.json",

  // --- Chunking ---
  chunkSize: num(process.env.CHUNK_SIZE, 700), // tamaño máximo de cada fragmento (caracteres)
  chunkOverlap: num(process.env.CHUNK_OVERLAP, 120), // caracteres que se repiten entre fragmentos

  // --- Embeddings (modelo local, se descarga la primera vez ~120 MB) ---
  embeddingModel: process.env.EMBEDDING_MODEL || "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
  // Ruta corta para evitar el límite de 260 caracteres de Windows
  modelsCacheDir: process.env.MODELS_DIR || path.join(os.homedir(), ".cache", "rag-app-models"),

  // --- Recuperación ---
  topK: num(process.env.TOP_K, 4), // cuántos fragmentos se recuperan
  minScore: num(process.env.MIN_SCORE, 0.35), // similitud mínima para considerar un fragmento relevante

  // --- LLM ---
  // "claude" | "ollama" | "none". Si no se indica: claude si hay ANTHROPIC_API_KEY, si no "none".
  llmProvider: process.env.LLM_PROVIDER || (process.env.ANTHROPIC_API_KEY ? "claude" : "none"),
  claudeModel: process.env.CLAUDE_MODEL || "claude-opus-5-5",
  ollamaUrl: process.env.OLLAMA_URL || "http://localhost:11434",
  ollamaModel: process.env.OLLAMA_MODEL || "llama3.2",

  port: num(process.env.PORT, 3000),
};

// Frase exacta que se usa cuando no hay información suficiente
export const NO_INFO =
  "No tengo información suficiente en los documentos para responder esa pregunta.";

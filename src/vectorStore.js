// PASO 4 — Base vectorial: guardar los vectores y buscar los más parecidos.
//
// Implementación propia de una base vectorial local persistida en JSON con
// índice "plano" (flat index): compara la consulta contra todos los vectores.
// Es exactamente lo que hacen FAISS (IndexFlatIP) o Chroma en colecciones pequeñas;
// para millones de vectores se usarían índices aproximados (HNSW, IVF).
import fs from "node:fs";
import path from "node:path";

/** Similitud coseno. Como los vectores están normalizados, basta el producto punto. */
export function cosineSimilarity(a, b) {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export class VectorStore {
  constructor(data = { meta: {}, items: [] }) {
    this.meta = data.meta;
    this.items = data.items; // [{ id, source, section, page, text, embedding }]
  }

  add(chunk, embedding) {
    this.items.push({ ...chunk, embedding: embedding.map((x) => +x.toFixed(6)) });
  }

  /** Búsqueda semántica: los k fragmentos con mayor similitud a la consulta. */
  search(queryVector, k = 4) {
    return this.items
      .map(({ embedding, ...rest }) => ({ ...rest, score: cosineSimilarity(queryVector, embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, k);
  }

  save(file) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ meta: this.meta, items: this.items }));
  }

  static load(file) {
    if (!fs.existsSync(file)) {
      throw new Error(`No existe la base vectorial (${file}). Ejecuta primero: npm run ingest`);
    }
    return new VectorStore(JSON.parse(fs.readFileSync(file, "utf8")));
  }

  stats() {
    const porDocumento = {};
    for (const it of this.items) porDocumento[it.source] = (porDocumento[it.source] || 0) + 1;
    return {
      documentos: Object.keys(porDocumento).length,
      fragmentos: this.items.length,
      dimensiones: this.items[0]?.embedding.length ?? 0,
      porDocumento,
      ...this.meta,
    };
  }
}

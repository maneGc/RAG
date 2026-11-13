// INDEXACIÓN (se ejecuta una vez, o cada vez que cambian los documentos):
//   documentos → extracción de texto → chunking → embeddings → base vectorial
// Uso: npm run ingest
import { config } from "./config.js";
import { loadDocuments } from "./loaders.js";
import { chunkDocuments, textForEmbedding } from "./chunker.js";
import { embed } from "./embeddings.js";
import { VectorStore } from "./vectorStore.js";

const inicio = performance.now();

console.log(`1) Cargando documentos de "${config.docsDir}"...`);
const docs = await loadDocuments(config.docsDir);
for (const d of docs) {
  const chars = d.pages.reduce((s, p) => s + p.text.length, 0);
  console.log(`   - ${d.source} (${d.type.toUpperCase()}, ${chars} caracteres)`);
}
if (docs.length === 0) {
  console.error("No se encontraron documentos PDF, TXT o MD.");
  process.exit(1);
}

console.log(`2) Dividiendo en fragmentos (tamaño ${config.chunkSize}, solapamiento ${config.chunkOverlap})...`);
const chunks = chunkDocuments(docs, config);
console.log(`   ${chunks.length} fragmentos generados`);

console.log(`3) Generando embeddings con ${config.embeddingModel}...`);
console.log("   (la primera vez se descarga el modelo, ~120 MB)");
const vectores = await embed(chunks.map(textForEmbedding));
console.log(`   ${vectores.length} vectores de ${vectores[0].length} dimensiones`);

console.log(`4) Guardando base vectorial en ${config.storePath}...`);
const store = new VectorStore({
  meta: {
    modeloEmbeddings: config.embeddingModel,
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
    creado: new Date().toISOString(),
  },
  items: [],
});
chunks.forEach((c, i) => store.add(c, vectores[i]));
store.save(config.storePath);

console.log(`Listo en ${((performance.now() - inicio) / 1000).toFixed(1)} s.`);

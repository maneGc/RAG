// Preguntar desde la terminal (sin interfaz web).
// Uso: npm run preguntar -- "¿Cuánto cuesta un examen extraordinario?"
import { config } from "./config.js";
import { VectorStore } from "./vectorStore.js";
import { ask } from "./rag.js";

const pregunta = process.argv.slice(2).join(" ");
if (!pregunta) {
  console.log('Uso: npm run preguntar -- "tu pregunta"');
  process.exit(1);
}

const r = await ask(VectorStore.load(config.storePath), pregunta);
console.log("\nFragmentos recuperados (similitud coseno):");
for (const c of r.candidatos) {
  const marca = c.score >= r.parametros.minScore ? "✔" : "·";
  console.log(`  ${marca} ${c.score.toFixed(3)}  ${c.source}${c.section ? " › " + c.section : ""}`);
}
console.log(`\nRespuesta:\n${r.respuesta}`);
if (r.motivo) console.log(`\n(${r.motivo})`);

// Prueba automática: preguntas que SÍ están en los documentos y preguntas que NO.
// Para las que sí están, se verifica que aparezca el DATO correcto (no solo el documento).
// Uso: npm run evaluar                       (recuperación + respuesta del LLM)
//      npm run evaluar -- --solo-busqueda    (solo recuperación, sin llamar al LLM)
import { config } from "./config.js";
import { VectorStore } from "./vectorStore.js";
import { ask } from "./rag.js";
import { embed } from "./embeddings.js";
import { llmDescription } from "./llm.js";
import { PRUEBAS } from "./pruebas.js";

const limpiar = (t) => t.replace(/\*\*/g, "");

const soloBusqueda = process.argv.includes("--solo-busqueda");
const store = VectorStore.load(config.storePath);
console.log(
  `LLM: ${soloBusqueda ? "desactivado (--solo-busqueda)" : llmDescription()} | umbral: ${config.minScore} | top-k: ${config.topK}\n`,
);

let aciertos = 0;
for (const [pregunta, dato] of PRUEBAS) {
  let fila;
  if (soloBusqueda) {
    const [v] = await embed([pregunta]);
    const candidatos = store.search(v, config.topK);
    const relevantes = candidatos.filter((r) => r.score >= config.minScore);
    const abstiene = relevantes.length === 0;
    // ¿Algún fragmento recuperado contiene el dato que responde la pregunta?
    const ok = dato ? relevantes.some((r) => dato.test(limpiar(r.text))) : abstiene;
    fila = { ok, score: candidatos[0].score, fuente: candidatos[0].source, abstiene };
  } else {
    const r = await ask(store, pregunta);
    const ok = dato ? !r.sinInformacion && dato.test(limpiar(r.respuesta)) : r.sinInformacion;
    fila = { ok, score: r.candidatos[0].score, fuente: r.candidatos[0].source, abstiene: r.sinInformacion, respuesta: r.respuesta };
  }
  if (fila.ok) aciertos++;
  console.log(
    `${fila.ok ? "✔" : "✘"} [${fila.score.toFixed(3)}] ${pregunta}\n` +
      `    dato esperado: ${dato ?? "(no está en los documentos → debe abstenerse)"} | mejor fragmento: ${fila.fuente} | ${fila.abstiene ? "SE ABSTUVO" : "RESPONDIÓ"}` +
      (fila.respuesta ? `\n    → ${fila.respuesta.replace(/\n+/g, " ").slice(0, 220)}` : "") +
      (soloBusqueda && !dato && !fila.abstiene
        ? "\n    (pregunta del mismo tema: el umbral no la filtra; la detecta el LLM en la 2ª capa)"
        : ""),
  );
}
console.log(`\nResultado: ${aciertos}/${PRUEBAS.length} correctas`);

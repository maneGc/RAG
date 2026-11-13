// PASO 5 y 6 — El flujo RAG completo para una pregunta:
//   pregunta → embedding → búsqueda semántica → filtro por similitud → prompt con contexto → LLM
import { config, NO_INFO } from "./config.js";
import { embed } from "./embeddings.js";
import { generate } from "./llm.js";

const SYSTEM_PROMPT = `Eres un asistente que responde preguntas sobre documentos del Instituto Tecnológico Valle Sereno (ITVS).

Reglas:
- Responde ÚNICAMENTE con la información de los fragmentos que se te proporcionan. No uses conocimiento propio ni inventes datos.
- Cita los fragmentos que usaste con su número entre corchetes, por ejemplo [1] o [2][3].
- Si los fragmentos no contienen la información necesaria para responder, responde exactamente: "${NO_INFO}"
- Si los fragmentos responden solo una parte de la pregunta, responde esa parte y aclara qué información no está en los documentos.
- Responde en español, de forma clara y breve.`;

function construirPrompt(pregunta, fragmentos) {
  const contexto = fragmentos
    .map((f, i) => {
      const ubicacion = [f.source, f.section, f.page ? `página ${f.page}` : null].filter(Boolean).join(" › ");
      return `[${i + 1}] (${ubicacion})\n${f.text}`;
    })
    .join("\n\n");
  return `Fragmentos recuperados de los documentos:\n\n${contexto}\n\nPregunta: ${pregunta}`;
}

function ms(inicio) {
  return Math.round(performance.now() - inicio);
}

export async function ask(store, pregunta, { topK = config.topK, minScore = config.minScore } = {}) {
  const tiempos = {};

  // 1) Embedding de la pregunta (mismo modelo que se usó con los documentos)
  let t = performance.now();
  const [vectorPregunta] = await embed([pregunta]);
  tiempos.embeddingMs = ms(t);

  // 2) Búsqueda semántica: top-k fragmentos más parecidos
  t = performance.now();
  const candidatos = store.search(vectorPregunta, topK);
  tiempos.busquedaMs = ms(t);

  // 3) Filtro: solo fragmentos por encima del umbral de similitud
  const relevantes = candidatos.filter((c) => c.score >= minScore);

  const base = {
    pregunta,
    candidatos: candidatos.map(({ text, ...c }) => ({ ...c, preview: text.slice(0, 160) })),
    parametros: { topK, minScore },
    tiempos,
  };

  // 4a) Si nada supera el umbral → no hay información suficiente (ni siquiera se llama al LLM)
  if (relevantes.length === 0) {
    return {
      ...base,
      respuesta: NO_INFO,
      sinInformacion: true,
      motivo: `Ningún fragmento superó la similitud mínima de ${minScore}.`,
      fuentes: [],
    };
  }

  // 4b) Generación aumentada: el LLM responde usando los fragmentos como contexto
  t = performance.now();
  const prompt = construirPrompt(pregunta, relevantes);
  const generado = await generate(SYSTEM_PROMPT, prompt);
  tiempos.llmMs = ms(t);

  const fuentes = relevantes.map((f, i) => ({ n: i + 1, ...f }));

  if (generado === null) {
    // Modo sin LLM: se devuelve el fragmento más relevante como respuesta extractiva
    return {
      ...base,
      respuesta: `(Modo sin LLM) Fragmento más relevante:\n\n${relevantes[0].text}`,
      sinInformacion: false,
      fuentes,
      prompt,
    };
  }

  const sinInformacion = generado.includes(NO_INFO);
  return {
    ...base,
    respuesta: generado,
    sinInformacion,
    motivo: sinInformacion ? "El LLM determinó que los fragmentos recuperados no responden la pregunta." : undefined,
    fuentes,
    prompt,
  };
}

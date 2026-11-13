// PASO 6 — Generación: el LLM redacta la respuesta usando SOLO los fragmentos recuperados.
//
// Proveedores soportados:
//  - "claude": API de Anthropic (requiere ANTHROPIC_API_KEY)
//  - "ollama": modelo local con Ollama (gratis, requiere tener Ollama instalado)
//  - "none":   sin LLM; la app muestra los fragmentos recuperados (útil para probar la recuperación)
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

let client = null;

async function generarConClaude(system, user) {
  client ??= new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: config.claudeModel,
      max_tokens: 16000,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { effort: "low" }, // preguntas y respuestas cortas: esfuerzo bajo = más rápido y barato
      // Si el modelo declina por política de seguridad, la API reintenta con un modelo de respaldo
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });
    if (response.stop_reason === "refusal") {
      return "El modelo no pudo responder esta pregunta.";
    }
    return response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      throw new Error("La ANTHROPIC_API_KEY no es válida. Revisa tu archivo .env");
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new Error("Se alcanzó el límite de solicitudes de la API. Intenta de nuevo en unos segundos.");
    }
    if (err instanceof Anthropic.APIConnectionError) {
      throw new Error("No se pudo conectar con la API de Anthropic. Revisa tu conexión a internet.");
    }
    if (err instanceof Anthropic.APIError) {
      throw new Error(`Error de la API de Anthropic (${err.status}): ${err.message}`);
    }
    throw err;
  }
}

async function generarConOllama(system, user) {
  let res;
  try {
    res = await fetch(`${config.ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.ollamaModel,
        stream: false,
        options: { temperature: 0 },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
  } catch {
    throw new Error(`No se pudo conectar con Ollama en ${config.ollamaUrl}. ¿Está abierto Ollama?`);
  }
  if (!res.ok) throw new Error(`Ollama respondió ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.message.content.trim();
}

/** Devuelve el texto generado, o null si no hay LLM configurado. */
export async function generate(system, user) {
  switch (config.llmProvider) {
    case "claude":
      return generarConClaude(system, user);
    case "ollama":
      return generarConOllama(system, user);
    default:
      return null;
  }
}

export function llmDescription() {
  switch (config.llmProvider) {
    case "claude":
      return `Claude (${config.claudeModel})`;
    case "ollama":
      return `Ollama (${config.ollamaModel})`;
    default:
      return "Sin LLM (solo recuperación)";
  }
}

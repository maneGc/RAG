// PASO 3 — Embeddings: convertir texto en vectores numéricos.
//
// Se usa un modelo Transformer multilingüe (paraphrase-multilingual-MiniLM-L12-v2)
// que corre localmente con ONNX (sin API, sin costo). Cada texto se convierte en un
// vector de 384 números. Textos con significado parecido quedan cerca en ese espacio.
import { pipeline, env } from "@huggingface/transformers";
import { config } from "./config.js";

env.cacheDir = config.modelsCacheDir;

let extractor = null;

async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline("feature-extraction", config.embeddingModel, { dtype: "q8" });
  }
  return extractor;
}

/**
 * Devuelve un vector normalizado (longitud 1) por cada texto.
 * pooling "mean" = promedio de los vectores de cada token → un vector por texto.
 * Al estar normalizados, el producto punto es igual a la similitud coseno.
 */
export async function embed(texts, batchSize = 16) {
  const fe = await getExtractor();
  const vectores = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const lote = texts.slice(i, i + batchSize);
    const salida = await fe(lote, { pooling: "mean", normalize: true });
    vectores.push(...salida.tolist());
  }
  return vectores;
}

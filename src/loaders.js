// PASO 1 — Carga y extracción de texto de los documentos (PDF, TXT, MD)
import fs from "node:fs";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";

const EXTENSIONES = [".pdf", ".txt", ".md"];

/**
 * Lee todos los documentos soportados de una carpeta.
 * Devuelve [{ source, type, pages: [{ page, text }] }]
 * (TXT y MD se tratan como un documento de una sola "página").
 */
export async function loadDocuments(dir) {
  const archivos = fs
    .readdirSync(dir)
    .filter((f) => EXTENSIONES.includes(path.extname(f).toLowerCase()))
    .sort();

  const docs = [];
  for (const archivo of archivos) {
    const ruta = path.join(dir, archivo);
    const ext = path.extname(archivo).toLowerCase();

    if (ext === ".pdf") {
      const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(ruta)));
      const { text } = await extractText(pdf, { mergePages: false });
      docs.push({
        source: archivo,
        type: "pdf",
        pages: text.map((t, i) => ({ page: i + 1, text: t })),
      });
    } else {
      docs.push({
        source: archivo,
        type: ext.slice(1),
        pages: [{ page: null, text: fs.readFileSync(ruta, "utf8") }],
      });
    }
  }
  return docs;
}

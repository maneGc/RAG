// PASO 2 — Chunking: dividir el texto en fragmentos pequeños con solapamiento.
//
// Estrategia (similar al RecursiveCharacterTextSplitter de LangChain):
//  1. Se separa el documento por secciones (títulos Markdown o líneas en MAYÚSCULAS),
//     para que un fragmento no mezcle temas distintos y conserve su título.
//  2. Cada sección se corta de forma recursiva intentando respetar, en este orden:
//     párrafos ("\n\n") → líneas ("\n") → oraciones (". ") → palabras (" ").
//  3. Se agrega un solapamiento (overlap) con el final del fragmento anterior para
//     no perder contexto cuando una idea queda partida entre dos fragmentos.

const SEPARADORES = ["\n\n", "\n", ". ", " "];

/** Divide el texto en secciones usando los títulos como frontera. */
export function splitSections(text, type) {
  const lineas = text.replace(/\r\n/g, "\n").split("\n");
  const secciones = [];
  let titulo = null;
  let buffer = [];

  const esTitulo = (l) => {
    const t = l.trim();
    if (type === "md") return /^#{1,6}\s+/.test(t);
    // TXT y PDF: líneas cortas en MAYÚSCULAS ("MULTAS") o numeradas sin punto final ("2. Integridad académica")
    const mayusculas = t.length > 3 && t === t.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(t);
    const numerado = /^\d+\.\s+\S/.test(t) && t.length < 70 && !/[.:]$/.test(t);
    return mayusculas || numerado;
  };

  const cerrar = () => {
    // En PDF cada renglón visual es una línea: se unen para recuperar los párrafos completos
    const contenido = buffer.join(type === "pdf" ? " " : "\n").trim();
    if (contenido) secciones.push({ title: titulo, text: contenido });
    buffer = [];
  };

  for (const l of lineas) {
    if (esTitulo(l)) {
      cerrar();
      titulo = l.replace(/^#+\s*/, "").trim();
    } else {
      buffer.push(l);
    }
  }
  cerrar();
  return secciones;
}

/** Corte recursivo: devuelve piezas de como máximo `size` caracteres. */
export function recursiveSplit(text, size, separadores = SEPARADORES) {
  if (text.length <= size) return [text];
  const [sep, ...resto] = separadores;
  if (sep === undefined) {
    // Último recurso: cortar a ciegas cada `size` caracteres
    const out = [];
    for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
    return out;
  }
  const partes = text.split(sep).filter((p) => p.trim());
  const piezas = [];
  let actual = "";
  for (const parte of partes) {
    const candidato = actual ? actual + sep + parte : parte;
    if (candidato.length <= size) {
      actual = candidato;
    } else {
      if (actual) piezas.push(actual);
      if (parte.length > size) {
        piezas.push(...recursiveSplit(parte, size, resto));
        actual = "";
      } else {
        actual = parte;
      }
    }
  }
  if (actual) piezas.push(actual);
  return piezas;
}

/** Toma los últimos `overlap` caracteres empezando en una palabra completa. */
function cola(texto, overlap) {
  if (overlap <= 0 || texto.length <= overlap) return overlap > 0 ? texto : "";
  const corte = texto.slice(-overlap);
  const espacio = corte.indexOf(" ");
  return espacio >= 0 ? corte.slice(espacio + 1) : corte;
}

/**
 * Convierte los documentos cargados en fragmentos (chunks) con metadatos.
 * Devuelve [{ id, source, section, page, text }]
 */
export function chunkDocuments(docs, { chunkSize, chunkOverlap }) {
  const chunks = [];
  for (const doc of docs) {
    let n = 0;
    for (const { page, text } of doc.pages) {
      for (const seccion of splitSections(text, doc.type)) {
        const piezas = recursiveSplit(seccion.text, chunkSize - chunkOverlap);
        piezas.forEach((pieza, i) => {
          const solapamiento = i > 0 ? cola(piezas[i - 1], chunkOverlap) : "";
          const cuerpo = (solapamiento ? solapamiento + " " : "") + pieza.trim();
          chunks.push({
            id: `${doc.source}#${n++}`,
            source: doc.source,
            section: seccion.title,
            page,
            text: cuerpo,
          });
        });
      }
    }
  }
  return chunks;
}

/**
 * Texto que realmente se convierte en embedding: se antepone el título de la
 * sección para que el vector capture de qué tema habla el fragmento.
 */
export function textForEmbedding(chunk) {
  return chunk.section ? `${chunk.section}: ${chunk.text}` : chunk.text;
}

// Genera documentos/codigo_de_conducta.pdf (documento ficticio de ejemplo)
// para demostrar que la app también lee PDF. Uso: npm run generar-pdf
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "node:fs";

const contenido = [
  ["h", "Código de Conducta Estudiantil - ITVS"],
  ["p", "(Documento ficticio creado para la demostración de la aplicación RAG.)"],
  ["h2", "1. Principios"],
  ["p", "La comunidad del Instituto Tecnológico Valle Sereno se rige por los principios de honestidad, respeto, responsabilidad e inclusión. Este código aplica dentro del campus, en actividades oficiales fuera de él y en los espacios digitales institucionales."],
  ["h2", "2. Integridad académica"],
  ["p", "Se considera falta grave copiar en exámenes, presentar trabajos ajenos como propios (plagio) o suplantar a otra persona en una evaluación. El uso de herramientas de inteligencia artificial generativa está permitido solo cuando el docente lo autorice por escrito, y el estudiante debe declarar qué herramienta usó y para qué."],
  ["p", "La primera falta de integridad académica se sanciona con calificación de 0 en la evaluación correspondiente. La reincidencia se sanciona con la reprobación de la asignatura y una suspensión de hasta un semestre."],
  ["h2", "3. Faltas leves"],
  ["p", "Son faltas leves: fumar dentro del campus, ingresar con alimentos a la biblioteca o laboratorios, y el uso inadecuado del mobiliario. Se sancionan con amonestación por escrito. Tres amonestaciones en un mismo año escolar equivalen a una falta grave."],
  ["h2", "4. Faltas graves"],
  ["p", "Son faltas graves: la violencia física o verbal, el acoso en cualquiera de sus formas, el daño intencional a instalaciones, la falsificación de documentos y el consumo de alcohol o drogas en el campus. Pueden sancionarse con suspensión temporal o baja definitiva."],
  ["h2", "5. Comité de Honor y Justicia"],
  ["p", "Las faltas graves son evaluadas por el Comité de Honor y Justicia, integrado por dos docentes, un representante estudiantil y el Director Académico. El estudiante tiene derecho a ser escuchado y a presentar pruebas. El Comité emite su resolución en un plazo máximo de 15 días hábiles, y el estudiante puede apelarla por escrito dentro de los 5 días hábiles siguientes."],
  ["h2", "6. Denuncias"],
  ["p", "Las denuncias pueden presentarse de forma anónima en el buzón digital del portal estudiantil o directamente en la Defensoría de los Derechos Estudiantiles, ubicada en el edificio B, oficina B-12."],
];

const pdf = await PDFDocument.create();
const font = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
let page = pdf.addPage([612, 792]);
let y = 740;
const margen = 60, ancho = 612 - margen * 2;

function envolver(texto, f, size) {
  const palabras = texto.split(" ");
  const lineas = [];
  let actual = "";
  for (const p of palabras) {
    const prueba = actual ? actual + " " + p : p;
    if (f.widthOfTextAtSize(prueba, size) > ancho) { lineas.push(actual); actual = p; }
    else actual = prueba;
  }
  if (actual) lineas.push(actual);
  return lineas;
}

for (const [tipo, texto] of contenido) {
  const f = tipo === "p" ? font : bold;
  const size = tipo === "h" ? 18 : tipo === "h2" ? 13 : 11;
  for (const linea of envolver(texto, f, size)) {
    if (y < 60) { page = pdf.addPage([612, 792]); y = 740; }
    page.drawText(linea, { x: margen, y, size, font: f, color: rgb(0.1, 0.1, 0.1) });
    y -= size + 6;
  }
  y -= 8;
}

fs.writeFileSync("documentos/codigo_de_conducta.pdf", await pdf.save());
console.log("PDF generado: documentos/codigo_de_conducta.pdf");

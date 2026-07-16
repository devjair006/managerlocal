import { useState } from "react";
import { ArrowLeft, FilePdf, Files, Images, Scissors, Stack } from "@phosphor-icons/react";
import { OutputActions } from "../../components/OutputActions";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { pdfTools, pickImageFiles, pickOutputDirectory, pickPdfFiles, pickPdfOutput, type PdfOperation } from "./pdf-tools.service";

interface Props { onBack: () => void; }

function nameFromPath(path: string) { return path.split(/[\\/]/).pop() ?? path; }

function parsePages(value: string): number[] {
  const pages = new Set<number>();
  for (const chunk of value.split(",").map((part) => part.trim()).filter(Boolean)) {
    if (chunk.includes("-")) {
      const [start, end] = chunk.split("-").map(Number);
      if (!start || !end || start > end || end - start > 5000) throw new Error(`Rango inválido: ${chunk}`);
      for (let page = start; page <= end; page++) pages.add(page);
    } else {
      const page = Number(chunk);
      if (!Number.isInteger(page) || page < 1) throw new Error(`Página inválida: ${chunk}`);
      pages.add(page);
    }
  }
  return [...pages].sort((a, b) => a - b);
}

const operations: { id: PdfOperation; label: string; description: string; icon: typeof Stack }[] = [
  { id: "merge", label: "Unir", description: "Combina varios PDF en el orden seleccionado", icon: Stack },
  { id: "extract", label: "Extraer", description: "Crea un PDF con páginas específicas", icon: Scissors },
  { id: "compress", label: "Optimizar", description: "Elimina objetos sin uso y comprime estructuras", icon: Files },
  { id: "images_to_pdf", label: "Imágenes a PDF", description: "Crea una página por cada imagen", icon: Images },
  { id: "pdf_to_images", label: "PDF a imágenes", description: "Exporta cada página como PNG", icon: FilePdf },
];

export function PdfTools({ onBack }: Props) {
  const [operation, setOperation] = useState<PdfOperation>("merge");
  const [paths, setPaths] = useState<string[]>([]);
  const [pageText, setPageText] = useState("1");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function chooseFiles() {
    try { setPaths(operation === "images_to_pdf" ? await pickImageFiles() : await pickPdfFiles(operation === "merge")); setResult(""); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }

  async function execute() {
    if (!paths.length) { setError("Selecciona los documentos PDF"); return; }
    setProcessing(true);
    try {
      const output = operation === "pdf_to_images" ? await pickOutputDirectory() : await pickPdfOutput(operation === "merge" ? "documentos-unidos.pdf" : operation === "extract" ? "paginas-extraidas.pdf" : operation === "images_to_pdf" ? "imagenes.pdf" : "documento-optimizado.pdf");
      if (!output) return;
      const pages = operation === "extract" ? parsePages(pageText) : [];
      setResult(await pdfTools({ operation, inputPaths: paths, outputPath: output, pages }));
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setProcessing(false); }
  }

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading"><ToolPixelIcon toolId="pdf-tools" className="pdf-icon" /><div><p className="eyebrow">PDF</p><h1>Herramientas PDF</h1><p>Une, extrae, optimiza y convierte documentos localmente.</p></div></div>
      <div className="operation-tabs">{operations.map(({ id, label, description, icon: Icon }) => <button key={id} className={operation === id ? "operation-tab active" : "operation-tab"} onClick={() => { setOperation(id); setPaths([]); setResult(""); }}><Icon weight="duotone" /><span><strong>{label}</strong><small>{description}</small></span></button>)}</div>
      <div className="file-tool-panel">
        <div className="file-picker-row"><div><strong>{operation === "merge" ? "Documentos a combinar" : operation === "images_to_pdf" ? "Imágenes y orden de páginas" : "Documento de entrada"}</strong><small>{paths.length ? `${paths.length} archivo(s) seleccionado(s)` : "No has seleccionado archivos"}</small></div><button className="secondary-button" onClick={() => void chooseFiles()}>{operation === "images_to_pdf" ? "Seleccionar imágenes" : "Seleccionar PDF"}</button></div>
        {paths.length > 0 && <ol className="selected-files">{paths.map((path) => <li key={path}><FilePdf /><span>{nameFromPath(path)}</span></li>)}</ol>}
        {operation === "extract" && <div className="field-block"><label htmlFor="pdf-pages">Páginas</label><input id="pdf-pages" value={pageText} onChange={(event) => setPageText(event.target.value)} placeholder="Ejemplo: 1, 3-5, 8" /><small>Separa páginas y rangos con comas.</small></div>}
        {operation === "compress" && <p className="tool-notice">La optimización es sin pérdida: elimina objetos innecesarios y comprime estructuras internas. Las imágenes conservarán su calidad.</p>}
        {operation === "images_to_pdf" && <p className="tool-notice">El orden seleccionado será el orden de las páginas. Las transparencias se colocan sobre fondo blanco.</p>}
        {operation === "pdf_to_images" && <p className="tool-notice">Exporta PNG a 150 DPI. Esta función necesita Poppler instalado en el equipo.</p>}
        <div className="panel-footer"><span className="privacy-note">Procesamiento local · Tus documentos no salen del equipo</span><button className="primary-button compact" disabled={processing || !paths.length} onClick={() => void execute()}>{processing ? "Procesando..." : operations.find((item) => item.id === operation)?.label}</button></div>
        {result && <OutputActions path={result} directory={operation === "pdf_to_images"} />}
        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

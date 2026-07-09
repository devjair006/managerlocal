import { useEffect, useState } from "react";
import { ArrowLeft, ArrowsLeftRight, Check, Copy, FileCode, FloppyDisk } from "@phosphor-icons/react";
import { OutputActions } from "../../components/OutputActions";
import { saveTextOutput } from "../../services/text-output";
import { convertDocument, type DocumentFormat } from "./document-converter.service";

interface Props { onBack: () => void; }
const labels: Record<DocumentFormat, string> = { markdown: "Markdown", html: "HTML", text: "Texto" };

export function DocumentConverter({ onBack }: Props) {
  const [source, setSource] = useState<DocumentFormat>("markdown"); const [target, setTarget] = useState<DocumentFormat>("html");
  const [content, setContent] = useState("# Hola\n\nEscribe **Markdown** aquí."); const [result, setResult] = useState("");
  const [error, setError] = useState(""); const [copied, setCopied] = useState(false); const [savedPath, setSavedPath] = useState("");
  useEffect(() => { const timer = window.setTimeout(async () => { if (!content.trim() || source === target) { setResult(content); return; } try { setResult(await convertDocument({ source, target, content })); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }, 180); return () => window.clearTimeout(timer); }, [content, source, target]);
  function swap() { setSource(target); setTarget(source); setContent(result); setResult(content); }
  async function copy() { await navigator.clipboard.writeText(result); setCopied(true); window.setTimeout(() => setCopied(false), 1200); }
  async function saveResult() { try { const extension = target === "markdown" ? "md" : target === "html" ? "html" : "txt"; const saved = await saveTextOutput(result, `convertido.${extension}`, labels[target], [extension]); if (saved) setSavedPath(saved); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }

  return <section className="tool-view"><button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><span className="tool-heading-icon document-icon"><FileCode weight="duotone" /></span><div><p className="eyebrow">Productividad</p><h1>Markdown, HTML y texto</h1><p>Convierte contenido estructurado localmente y copia el resultado.</p></div></div>
    <div className="document-format-row"><label>Origen<select value={source} onChange={(event) => setSource(event.target.value as DocumentFormat)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button onClick={swap} aria-label="Intercambiar formatos"><ArrowsLeftRight /></button><label>Destino<select value={target} onChange={(event) => setTarget(event.target.value as DocumentFormat)}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    <div className="document-editors"><label><span>Contenido {labels[source]}</span><textarea value={content} onChange={(event) => setContent(event.target.value)} spellCheck={false} /></label><label><span><b>Resultado {labels[target]}</b><i><button disabled={!result} onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar"}</button><button disabled={!result} onClick={() => void saveResult()}><FloppyDisk /> Guardar</button></i></span><textarea value={result} readOnly spellCheck={false} /></label></div>
    {savedPath && <OutputActions path={savedPath} />}
    <p className="privacy-note">Procesamiento local · El contenido no sale del equipo</p>{source === target && <p className="tool-notice">El formato de origen y destino es el mismo; el contenido se conserva sin cambios.</p>}{error && <p className="error-text tool-error">{error}</p>}
  </section>;
}

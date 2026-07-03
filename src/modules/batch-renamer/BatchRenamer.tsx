import { useMemo, useState } from "react";
import { ArrowLeft, ArrowsClockwise, CheckCircle, Files } from "@phosphor-icons/react";
import { batchRenamer, pickFilesToRename } from "./batch-renamer.service";

interface Props { onBack: () => void; }
function fileName(path: string) { return path.split(/[\\/]/).pop() ?? path; }
function previewName(path: string, index: number, prefix: string, suffix: string, find: string, replace: string, numbering: boolean, start: number) {
  const name = fileName(path); const dot = name.lastIndexOf("."); const stem = dot > 0 ? name.slice(0, dot) : name; const extension = dot > 0 ? name.slice(dot) : "";
  const changed = find ? stem.split(find).join(replace) : stem;
  return `${prefix}${changed}${suffix}${numbering ? `_${String(start + index).padStart(3, "0")}` : ""}${extension}`;
}

export function BatchRenamer({ onBack }: Props) {
  const [paths, setPaths] = useState<string[]>([]); const [prefix, setPrefix] = useState(""); const [suffix, setSuffix] = useState("");
  const [find, setFind] = useState(""); const [replace, setReplace] = useState(""); const [numbering, setNumbering] = useState(false); const [start, setStart] = useState(1);
  const [processing, setProcessing] = useState(false); const [result, setResult] = useState(0); const [error, setError] = useState("");
  const preview = useMemo(() => paths.map((path, index) => ({ old: fileName(path), next: previewName(path, index, prefix, suffix, find, replace, numbering, start) })), [paths, prefix, suffix, find, replace, numbering, start]);
  async function choose() { try { setPaths(await pickFilesToRename()); setResult(0); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }
  async function rename() { setProcessing(true); try { const changed = await batchRenamer({ paths, prefix, suffix, find, replace, numbering, startNumber: start }); setResult(changed.length); setPaths([]); setError(""); } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } finally { setProcessing(false); } }

  return <section className="tool-view"><button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><span className="tool-heading-icon rename-icon"><ArrowsClockwise weight="duotone" /></span><div><p className="eyebrow">Productividad</p><h1>Renombrar archivos</h1><p>Previsualiza y aplica reglas seguras a grupos de archivos.</p></div></div>
    <div className="file-tool-panel"><div className="file-picker-row"><div><strong>Archivos</strong><small>{paths.length ? `${paths.length} seleccionados` : "Selecciona hasta 1000 archivos"}</small></div><button className="secondary-button" onClick={() => void choose()}><Files /> Seleccionar</button></div>
      <div className="rename-form"><label>Prefijo<input value={prefix} onChange={(event) => setPrefix(event.target.value)} placeholder="proyecto-" /></label><label>Sufijo<input value={suffix} onChange={(event) => setSuffix(event.target.value)} placeholder="-final" /></label><label>Buscar<input value={find} onChange={(event) => setFind(event.target.value)} /></label><label>Reemplazar<input value={replace} onChange={(event) => setReplace(event.target.value)} /></label><label className="check-field"><input type="checkbox" checked={numbering} onChange={(event) => setNumbering(event.target.checked)} /> Añadir numeración</label>{numbering && <label>Comenzar en<input type="number" min="0" value={start} onChange={(event) => setStart(Number(event.target.value))} /></label>}</div>
      {preview.length > 0 && <div className="rename-preview"><div><strong>Antes</strong><strong>Después</strong></div>{preview.slice(0, 30).map((item, index) => <div key={`${item.old}-${index}`}><span>{item.old}</span><span>{item.next}</span></div>)}{preview.length > 30 && <small>y {preview.length - 30} archivos más…</small>}</div>}
      <p className="tool-notice">Los archivos se renombran en su carpeta actual. Si algún nombre entra en conflicto, no se realiza ningún cambio.</p>
      <div className="panel-footer"><span className="privacy-note">Revisa la vista previa antes de aplicar</span><button className="primary-button compact" disabled={!paths.length || processing} onClick={() => void rename()}>{processing ? "Renombrando..." : "Aplicar nombres"}</button></div>
      {result > 0 && <p className="success-message"><CheckCircle weight="fill" /> {result} archivos renombrados</p>}{error && <p className="error-text tool-error">{error}</p>}
    </div></section>;
}

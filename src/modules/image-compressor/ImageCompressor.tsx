import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, FileImage, FolderOpen, Gauge, Images } from "@phosphor-icons/react";
import { OutputActions } from "../../components/OutputActions";
import { compressImages, pickCompressionFolder, pickImagesToCompress, type CompressionResult } from "./image-compressor.service";

interface Props { onBack: () => void; }
function fileName(path: string) { return path.split(/[\\/]/).pop() ?? path; }
function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
}
function savingPercent(item: CompressionResult) {
  return item.originalBytes ? Math.round((1 - item.compressedBytes / item.originalBytes) * 100) : 0;
}

export function ImageCompressor({ onBack }: Props) {
  const [paths, setPaths] = useState<string[]>([]);
  const [outputDirectory, setOutputDirectory] = useState("");
  const [quality, setQuality] = useState(78);
  const [results, setResults] = useState<CompressionResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const totals = useMemo(() => results.reduce((sum, item) => ({
    before: sum.before + item.originalBytes,
    after: sum.after + item.compressedBytes,
  }), { before: 0, after: 0 }), [results]);

  async function chooseImages() {
    try {
      const selected = await pickImagesToCompress();
      if (selected.length > 100) throw new Error("Selecciona un máximo de 100 imágenes");
      setPaths(selected); setResults([]); setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function chooseFolder() {
    try {
      const selected = await pickCompressionFolder();
      if (selected) setOutputDirectory(selected);
      setError("");
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  }
  async function compress() {
    setProcessing(true);
    try { setResults(await compressImages(paths, outputDirectory, quality)); setError(""); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setProcessing(false); }
  }

  return <section className="tool-view">
    <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><span className="tool-heading-icon compressor-icon"><Gauge weight="duotone" /></span><div><p className="eyebrow">Imágenes</p><h1>Comprimir imágenes por lotes</h1><p>Reduce el peso de varias imágenes y compara el resultado.</p></div></div>
    <div className="file-tool-panel">
      <div className="compressor-pickers">
        <button className="media-picker" onClick={() => void chooseImages()}><Images weight="duotone" /><span><strong>Seleccionar imágenes</strong><small>{paths.length ? `${paths.length} seleccionadas` : "PNG, JPG, WebP, BMP o TIFF · hasta 100"}</small></span></button>
        <button className="media-picker" onClick={() => void chooseFolder()}><FolderOpen weight="duotone" /><span><strong>Carpeta de salida</strong><small>{outputDirectory || "Los originales no serán modificados"}</small></span></button>
      </div>
      {paths.length > 0 && <ul className="selected-files compressor-files">{paths.slice(0, 8).map((path) => <li key={path}><FileImage /> {fileName(path)}</li>)}{paths.length > 8 && <li>y {paths.length - 8} imágenes más…</li>}</ul>}
      <div className="quality-control compressor-quality"><label htmlFor="compression-quality">Calidad JPG</label><output>{quality}%</output><input id="compression-quality" type="range" min="35" max="95" value={quality} onChange={(event) => setQuality(Number(event.target.value))} /><small>70–85 suele dar una buena reducción sin pérdida visual evidente.</small></div>
      <p className="tool-notice">La salida se guarda como JPG. Las zonas transparentes se colocan sobre fondo blanco.</p>
      <div className="panel-footer"><span className="privacy-note">Todo se procesa localmente con Rust</span><button className="primary-button compact" disabled={!paths.length || !outputDirectory || processing} onClick={() => void compress()}>{processing ? "Comprimiendo..." : "Comprimir lote"}</button></div>
      {results.length > 0 && <div className="compression-results">
        <OutputActions path={outputDirectory} label="Lote guardado en" directory />
        <div className="compression-summary"><span><CheckCircle weight="fill" /> {results.length} procesadas</span><strong>{formatBytes(totals.before)} → {formatBytes(totals.after)}</strong><em>{Math.max(0, Math.round((1 - totals.after / totals.before) * 100))}% menos</em></div>
        <div className="compression-table"><div><strong>Archivo</strong><strong>Antes</strong><strong>Después</strong><strong>Ahorro</strong></div>{results.map((item) => <div key={item.outputPath}><span title={item.outputPath}>{item.fileName}</span><span>{formatBytes(item.originalBytes)}</span><span>{formatBytes(item.compressedBytes)}</span><span className={savingPercent(item) > 0 ? "positive-saving" : "negative-saving"}>{savingPercent(item)}%</span></div>)}</div>
      </div>}
      {error && <p className="error-text tool-error">{error}</p>}
    </div>
  </section>;
}

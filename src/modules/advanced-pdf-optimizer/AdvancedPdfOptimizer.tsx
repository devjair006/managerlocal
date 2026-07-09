import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, FilePdf, Gauge } from "@phosphor-icons/react";
import {
  getPdfOptimizerRuntime,
  optimizePdfAdvanced,
  pickPdfInput,
  pickPdfOutput,
  type PdfOptimizationProfile,
  type PdfOptimizationResult,
  type PdfOptimizerRuntime,
} from "./advanced-pdf-optimizer.service";

interface Props { onBack: () => void; }

const profiles: { id: PdfOptimizationProfile; label: string; description: string }[] = [
  { id: "screen", label: "Máxima compresión", description: "Archivos pequeños para compartir. Puede bajar bastante la calidad visual." },
  { id: "ebook", label: "Lectura equilibrada", description: "Buen balance para documentos, apuntes y PDFs de uso diario." },
  { id: "printer", label: "Impresión", description: "Conserva más detalle, pesa más, útil si vas a imprimir." },
  { id: "prepress", label: "Preprensa", description: "Alta calidad para trabajos gráficos. Reducción menor." },
  { id: "default", label: "Automático", description: "Perfil estándar de Ghostscript." },
];

function fileName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function AdvancedPdfOptimizer({ onBack }: Props) {
  const [runtime, setRuntime] = useState<PdfOptimizerRuntime | null>(null);
  const [inputPath, setInputPath] = useState("");
  const [profile, setProfile] = useState<PdfOptimizationProfile>("ebook");
  const [result, setResult] = useState<PdfOptimizationResult | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getPdfOptimizerRuntime().then(setRuntime).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  const selectedProfile = useMemo(() => profiles.find((item) => item.id === profile), [profile]);

  async function chooseInput() {
    try {
      const selected = await pickPdfInput();
      if (selected) {
        setInputPath(selected);
        setResult(null);
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function run() {
    if (!inputPath) {
      setError("Selecciona un PDF de entrada");
      return;
    }
    setProcessing(true);
    try {
      const outputPath = await pickPdfOutput(fileName(inputPath).replace(/\.pdf$/i, "-optimizado.pdf"));
      if (!outputPath) return;
      setResult(await optimizePdfAdvanced(inputPath, outputPath, profile));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon pdf-icon"><Gauge weight="duotone" /></span>
        <div>
          <p className="eyebrow">PDF</p>
          <h1>Optimizador PDF avanzado</h1>
          <p>Reduce PDFs con perfiles de Ghostscript para compartir, leer o imprimir.</p>
        </div>
      </div>

      <div className="runtime-status">
        <span className={runtime?.ghostscript ? "runtime-dot ready" : "runtime-dot"} />
        Ghostscript {runtime?.ghostscript ? `disponible (${runtime.executable})` : "no encontrado"}
      </div>

      <div className="file-tool-panel">
        <button className="media-picker" onClick={() => void chooseInput()}>
          <FilePdf weight="duotone" />
          <span>
            <strong>{inputPath ? fileName(inputPath) : "Seleccionar PDF"}</strong>
            <small>El archivo se procesa localmente y se guarda como un nuevo PDF.</small>
          </span>
        </button>

        <div className="operation-tabs compact-tabs">
          {profiles.map((item) => (
            <button key={item.id} className={profile === item.id ? "operation-tab active" : "operation-tab"} onClick={() => setProfile(item.id)}>
              <Gauge weight="duotone" />
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>

        <p className="tool-notice">
          Perfil actual: <strong>{selectedProfile?.label}</strong>. Esto sí puede recomprimir imágenes internas del PDF, por eso es diferente al optimizador sin pérdida.
        </p>

        {!runtime?.ghostscript && (
          <p className="tool-notice">
            Falta Ghostscript. En desarrollo puedes instalarlo con: <code>winget install ArtifexSoftware.Ghostscript</code>. Después reinicia Cursor y ejecuta <code>npm run tauri dev</code>.
          </p>
        )}

        <div className="panel-footer">
          <span className="privacy-note">Procesamiento local · sin subir documentos</span>
          <button className="primary-button compact" disabled={!inputPath || processing || !runtime?.ghostscript} onClick={() => void run()}>
            {processing ? "Optimizando..." : "Optimizar PDF"}
          </button>
        </div>

        {result && (
          <div className="conversion-result">
            <p className="success-message"><CheckCircle weight="fill" /> Guardado en {result.outputPath}</p>
            <div className="result-grid">
              <span><strong>Antes</strong>{formatBytes(result.originalBytes)}</span>
              <span><strong>Después</strong>{formatBytes(result.optimizedBytes)}</span>
              <span><strong>Ahorro</strong>{formatBytes(result.savedBytes)} · {result.savedPercent.toFixed(1)}%</span>
            </div>
          </div>
        )}

        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

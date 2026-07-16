import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FilePdf, Gauge } from "@phosphor-icons/react";
import { OutputActions } from "../../components/OutputActions";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
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
  { id: "screen", label: "Máxima compresión", description: "Prioriza archivos pequeños cuando Ghostscript está disponible." },
  { id: "ebook", label: "Lectura equilibrada", description: "Buen balance para documentos, apuntes y uso diario." },
  { id: "printer", label: "Impresión", description: "Conserva más detalle para impresión." },
  { id: "prepress", label: "Preprensa", description: "Alta calidad para trabajos gráficos." },
  { id: "default", label: "Automático", description: "Perfil estándar del motor disponible." },
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
  const hasEngine = Boolean(runtime?.ghostscript || runtime?.mutool);
  const engineLabel = runtime?.ghostscript ? `Ghostscript disponible (${runtime.executable})` : runtime?.mutool ? `MuPDF/mutool disponible (${runtime.executable})` : "no encontrado";

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
        <ToolPixelIcon toolId="advanced-pdf-optimizer" className="pdf-icon" />
        <div>
          <p className="eyebrow">PDF</p>
          <h1>Optimizador PDF avanzado</h1>
          <p>Reduce PDFs usando Ghostscript o MuPDF/mutool de forma local.</p>
        </div>
      </div>

      <div className="runtime-status">
        <span className={hasEngine ? "runtime-dot ready" : "runtime-dot"} />
        Motor PDF {engineLabel}
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
          Perfil actual: <strong>{selectedProfile?.label}</strong>. Ghostscript aplica perfiles de calidad; MuPDF/mutool limpia, compacta y recomprime estructuras.
        </p>

        {!hasEngine && <p className="tool-notice">Falta Ghostscript o MuPDF/mutool. Instala uno de los dos o empaquétalo como sidecar.</p>}

        <div className="panel-footer">
          <span className="privacy-note">Procesamiento local · sin subir documentos</span>
          <button className="primary-button compact" disabled={!inputPath || processing || !hasEngine} onClick={() => void run()}>
            {processing ? "Optimizando..." : "Optimizar PDF"}
          </button>
        </div>

        {result && (
          <div className="conversion-result">
            <OutputActions path={result.outputPath} />
            <div className="result-grid">
              <span><strong>Motor</strong>{result.engine}</span>
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

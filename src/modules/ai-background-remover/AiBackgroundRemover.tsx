import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardText, ImageSquare, MagicWand, Sparkle, X } from "@phosphor-icons/react";
import { OutputActions } from "../../components/OutputActions";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import {
  cancelRemoveBackgroundAi,
  getAiBackgroundRuntime,
  imageSrc,
  listenAiBackgroundProgress,
  pickAiBackgroundInput,
  pickAiBackgroundOutput,
  removeBackgroundAi,
  type AiBackgroundModel,
  type AiBackgroundProgressStage,
  type AiBackgroundRuntime,
} from "./ai-background-remover.service";

interface Props { onBack: () => void; }

const models: { id: AiBackgroundModel; label: string; description: string }[] = [
  { id: "default", label: "Automático", description: "Modelo por defecto de rembg. Buen punto de partida." },
  { id: "u2net", label: "U²-Net", description: "General, estable y liviano." },
  { id: "u2net_human_seg", label: "Personas", description: "Mejor para retratos y cuerpo humano." },
  { id: "isnet-general-use", label: "IS-Net", description: "General con buen detalle en bordes." },
  { id: "birefnet-general", label: "BiRefNet", description: "Modelo moderno; puede requerir más descarga/memoria." },
];

const progressLabels: Record<AiBackgroundProgressStage, string> = {
  starting: "Iniciando rembg...",
  downloadingModel: "Descargando modelo de IA...",
  processing: "Recortando con IA...",
  saving: "Guardando resultado...",
  done: "Listo",
};

function name(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export function AiBackgroundRemover({ onBack }: Props) {
  const [runtime, setRuntime] = useState<AiBackgroundRuntime | null>(null);
  const [inputPath, setInputPath] = useState("");
  const [inputPreview, setInputPreview] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [outputPreview, setOutputPreview] = useState("");
  const [model, setModel] = useState<AiBackgroundModel>("u2net");
  const [qualityMode, setQualityMode] = useState(false);
  const [optimizeSize, setOptimizeSize] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [progressStage, setProgressStage] = useState<AiBackgroundProgressStage | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function refreshRuntime() {
    try {
      setRuntime(await getAiBackgroundRuntime());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => { void refreshRuntime(); }, []);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let mounted = true;

    listenAiBackgroundProgress((event) => {
      if (!mounted) return;
      setProgressStage(event.payload.stage);
    }).then((fn) => { unlisten = fn; }).catch(() => undefined);

    return () => {
      mounted = false;
      unlisten?.();
    };
  }, []);

  async function chooseInput() {
    try {
      const selected = await pickAiBackgroundInput();
      if (selected) {
        setInputPath(selected);
        setInputPreview(await imageSrc(selected));
        setOutputPath("");
        setOutputPreview("");
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function copyExecutable() {
    if (!runtime?.executable) return;
    await navigator.clipboard.writeText(runtime.executable);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  async function run() {
    if (!inputPath) {
      setError("Selecciona una imagen");
      return;
    }
    setProcessing(true);
    setProgressStage("starting");
    setOutputPath("");
    setOutputPreview("");
    try {
      const target = await pickAiBackgroundOutput(name(inputPath).replace(/\.[^.]+$/, "-sin-fondo-ia.png"));
      if (!target) {
        setProcessing(false);
        setProgressStage(null);
        return;
      }
      const effectiveModel = qualityMode ? model : "u2net";
      const saved = await removeBackgroundAi({
        inputPath,
        outputPath: target,
        model: effectiveModel,
        alphaMatting: qualityMode,
        optimizeSize,
      });
      setOutputPath(saved);
      setOutputPreview(await imageSrc(saved));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProcessing(false);
      setProgressStage(null);
    }
  }

  async function cancel() {
    try {
      await cancelRemoveBackgroundAi();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <section className="tool-view background-tool">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <ToolPixelIcon toolId="ai-background-remover" className="background-icon" />
        <div><p className="eyebrow">Imágenes</p><h1>Quitar fondo con IA local</h1><p>Separa sujeto y fondo usando rembg sin subir imágenes a internet.</p></div>
      </div>

      <div className="runtime-status"><span className={runtime?.rembg ? "runtime-dot ready" : "runtime-dot"} /> rembg {runtime?.rembg ? `disponible (${runtime.executable})` : "no encontrado"}</div>

      <div className="file-tool-panel">
        <button className="media-picker" onClick={() => void chooseInput()}>
          <ImageSquare weight="duotone" />
          <span><strong>{inputPath ? name(inputPath) : "Seleccionar imagen"}</strong><small>PNG, JPG, WebP, BMP o TIFF · máximo 50 MB</small></span>
        </button>

        <div className="operation-tabs compact-tabs">
          {models.map((item) => (
            <button key={item.id} className={model === item.id ? "operation-tab active" : "operation-tab"} onClick={() => setModel(item.id)} disabled={processing || !qualityMode}>
              <MagicWand weight="duotone" />
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>

        <div className="quality-toggle">
          <button className={qualityMode ? "quality-option" : "quality-option active"} onClick={() => setQualityMode(false)} disabled={processing}>
            <span><strong>Rápido</strong><small>u2net · sin alpha matting · ideal para productos y formas simples</small></span>
          </button>
          <button className={qualityMode ? "quality-option active" : "quality-option"} onClick={() => setQualityMode(true)} disabled={processing}>
            <span><strong>Calidad</strong><small>modelo seleccionado · alpha matting · mejora pelo, pelos y bordes suaves</small></span>
          </button>
        </div>

        <label className="permission-confirm">
          <input type="checkbox" checked={optimizeSize} onChange={(event) => setOptimizeSize(event.target.checked)} disabled={processing} />
          Optimizar imágenes grandes antes de procesar. Reduce a 2048 px el lado más largo: mucho más rápido y consume menos RAM.
        </label>

        <div className="dependency-actions transcription-actions">
          <button onClick={() => void refreshRuntime()} disabled={processing}>Revisar rembg</button>
          {runtime?.executable && <button onClick={() => void copyExecutable()}><ClipboardText /> {copied ? "Copiado" : "Copiar ruta"}</button>}
          {runtime?.modelsDirectory && <button onClick={() => void navigator.clipboard.writeText(runtime.modelsDirectory)}>Copiar carpeta de modelos</button>}
        </div>

        {!runtime?.rembg && <p className="tool-notice">Falta rembg. Instálalo de forma aislada con: <code>powershell -ExecutionPolicy Bypass -File scripts\install-rembg.ps1 -InstallPython</code>. La primera ejecución descargará el modelo elegido localmente.</p>}

        {processing && progressStage && (
          <div className="progress-card">
            <div className="progress-info">
              <span className="tool-loading-spinner" aria-hidden="true" />
              <span>{progressLabels[progressStage]}</span>
            </div>
            <button className="secondary-button" onClick={() => void cancel()}><X /> Cancelar</button>
          </div>
        )}

        {(inputPreview || outputPreview) && (
          <div className="image-comparison">
            <figure><figcaption>Original</figcaption><div className="image-stage">{inputPreview ? <img src={inputPreview} alt="Imagen original" /> : null}</div></figure>
            <figure><figcaption>Resultado IA</figcaption><div className="image-stage checkerboard">{outputPreview ? <img src={outputPreview} alt="Imagen sin fondo con IA" /> : <div className="result-placeholder"><Sparkle /><span>Procesa para ver el resultado</span></div>}</div></figure>
          </div>
        )}

        <div className="panel-footer">
          <span className="privacy-note">Procesamiento local · salida PNG transparente</span>
          <button className="primary-button compact" disabled={!inputPath || processing || !runtime?.rembg} onClick={() => void run()}>{processing ? "Recortando..." : "Quitar fondo con IA"}</button>
        </div>

        {outputPath && <OutputActions path={outputPath} />}
        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

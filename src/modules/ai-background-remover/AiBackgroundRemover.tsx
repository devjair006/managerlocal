import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, ImageSquare, MagicWand, Sparkle } from "@phosphor-icons/react";
import {
  getAiBackgroundRuntime,
  imageSrc,
  pickAiBackgroundInput,
  pickAiBackgroundOutput,
  removeBackgroundAi,
  type AiBackgroundModel,
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

function name(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export function AiBackgroundRemover({ onBack }: Props) {
  const [runtime, setRuntime] = useState<AiBackgroundRuntime | null>(null);
  const [inputPath, setInputPath] = useState("");
  const [inputPreview, setInputPreview] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [outputPreview, setOutputPreview] = useState("");
  const [model, setModel] = useState<AiBackgroundModel>("default");
  const [alphaMatting, setAlphaMatting] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getAiBackgroundRuntime().then(setRuntime).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
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

  async function run() {
    if (!inputPath) {
      setError("Selecciona una imagen");
      return;
    }
    setProcessing(true);
    try {
      const target = await pickAiBackgroundOutput(name(inputPath).replace(/\.[^.]+$/, "-sin-fondo-ia.png"));
      if (!target) return;
      const saved = await removeBackgroundAi({ inputPath, outputPath: target, model, alphaMatting });
      setOutputPath(saved);
      setOutputPreview(await imageSrc(saved));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="tool-view background-tool">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon background-icon"><Sparkle weight="duotone" /></span>
        <div><p className="eyebrow">Imágenes</p><h1>Quitar fondo con IA local</h1><p>Separa sujeto y fondo usando rembg sin subir imágenes a internet.</p></div>
      </div>

      <div className="runtime-status"><span className={runtime?.rembg ? "runtime-dot ready" : "runtime-dot"} /> rembg {runtime?.rembg ? "disponible" : "no encontrado"}</div>

      <div className="file-tool-panel">
        <button className="media-picker" onClick={() => void chooseInput()}>
          <ImageSquare weight="duotone" />
          <span><strong>{inputPath ? name(inputPath) : "Seleccionar imagen"}</strong><small>PNG, JPG, WebP, BMP o TIFF · máximo 50 MB</small></span>
        </button>

        <div className="operation-tabs compact-tabs">
          {models.map((item) => (
            <button key={item.id} className={model === item.id ? "operation-tab active" : "operation-tab"} onClick={() => setModel(item.id)}>
              <MagicWand weight="duotone" />
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>

        <label className="permission-confirm">
          <input type="checkbox" checked={alphaMatting} onChange={(event) => setAlphaMatting(event.target.checked)} />
          Refinar bordes con alpha matting. Tarda más, pero suele mejorar pelo, productos y bordes suaves.
        </label>

        {!runtime?.rembg && <p className="tool-notice">Falta rembg. En desarrollo puedes instalarlo con: <code>pip install "rembg[cli]"</code>. La primera ejecución puede descargar modelos locales.</p>}

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

        {outputPath && <p className="success-message"><CheckCircle weight="fill" /> Guardado en {outputPath}</p>}
        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

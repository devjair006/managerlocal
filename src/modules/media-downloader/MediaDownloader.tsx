import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, DownloadSimple, FolderOpen, MusicNotes, VideoCamera } from "@phosphor-icons/react";
import {
  downloadPermittedMedia,
  getMediaDownloaderRuntime,
  pickDownloadDirectory,
  type MediaDownloadMode,
  type MediaDownloadResult,
  type MediaDownloaderRuntime,
} from "./media-downloader.service";

interface Props { onBack: () => void; }

const modes: { id: MediaDownloadMode; label: string; description: string }[] = [
  { id: "best", label: "Mejor disponible", description: "Descarga el mejor formato sin forzar conversión." },
  { id: "mp4", label: "Video MP4", description: "Descarga y fusiona a MP4 usando FFmpeg." },
  { id: "mp3", label: "Audio MP3", description: "Extrae audio a MP3 usando FFmpeg." },
];

function name(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export function MediaDownloader({ onBack }: Props) {
  const [runtime, setRuntime] = useState<MediaDownloaderRuntime | null>(null);
  const [url, setUrl] = useState("");
  const [outputDirectory, setOutputDirectory] = useState("");
  const [mode, setMode] = useState<MediaDownloadMode>("best");
  const [confirmPermitted, setConfirmPermitted] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<MediaDownloadResult | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void getMediaDownloaderRuntime().then(setRuntime).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  async function chooseDirectory() {
    try {
      const selected = await pickDownloadDirectory();
      if (selected) setOutputDirectory(selected);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function run() {
    setProcessing(true);
    try {
      setResult(await downloadPermittedMedia({ url, outputDirectory, mode, confirmPermitted }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProcessing(false);
    }
  }

  const needsFfmpeg = mode === "mp4" || mode === "mp3";
  const canRun = Boolean(runtime?.ytDlp && (!needsFfmpeg || runtime.ffmpeg) && url.trim() && outputDirectory && confirmPermitted && !processing);

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon video-icon"><DownloadSimple weight="duotone" /></span>
        <div>
          <p className="eyebrow">Multimedia</p>
          <h1>Descarga permitida</h1>
          <p>Descarga o convierte medios solo cuando tengas permiso y las condiciones del sitio lo permitan.</p>
        </div>
      </div>

      <div className="runtime-status">
        <span className={runtime?.ytDlp ? "runtime-dot ready" : "runtime-dot"} /> yt-dlp {runtime?.ytDlp ? "disponible" : "no encontrado"}
        <span className={runtime?.ffmpeg ? "runtime-dot ready" : "runtime-dot"} /> FFmpeg {runtime?.ffmpeg ? "disponible" : "no encontrado"}
      </div>

      <div className="file-tool-panel">
        <div className="field-block">
          <label htmlFor="media-url">URL del medio</label>
          <input id="media-url" value={url} onChange={(event) => { setUrl(event.target.value); setResult(null); }} placeholder="https://..." />
          <small>No uses esta herramienta para DRM, contenido privado o sitios donde la descarga esté prohibida.</small>
        </div>

        <button className="media-picker" onClick={() => void chooseDirectory()}>
          <FolderOpen weight="duotone" />
          <span><strong>{outputDirectory ? name(outputDirectory) : "Seleccionar carpeta de salida"}</strong><small>{outputDirectory || "Aquí se guardará el archivo descargado"}</small></span>
        </button>

        <div className="operation-tabs compact-tabs">
          {modes.map((item) => (
            <button key={item.id} className={mode === item.id ? "operation-tab active" : "operation-tab"} onClick={() => { setMode(item.id); setResult(null); }}>
              {item.id === "mp3" ? <MusicNotes weight="duotone" /> : <VideoCamera weight="duotone" />}
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
            </button>
          ))}
        </div>

        <label className="permission-confirm">
          <input type="checkbox" checked={confirmPermitted} onChange={(event) => setConfirmPermitted(event.target.checked)} />
          Confirmo que tengo permiso para descargar o convertir este contenido y que no viola las condiciones del sitio.
        </label>

        {!runtime?.ytDlp && <p className="tool-notice">Falta yt-dlp. En desarrollo puedes instalarlo con: <code>winget install yt-dlp.yt-dlp</code></p>}
        {needsFfmpeg && !runtime?.ffmpeg && <p className="tool-notice">Este modo necesita FFmpeg. Instálalo o empaquétalo como sidecar.</p>}

        <div className="panel-footer">
          <span className="privacy-note">El procesamiento ocurre localmente mediante herramientas del sistema</span>
          <button className="primary-button compact" disabled={!canRun} onClick={() => void run()}>{processing ? "Procesando..." : "Descargar"}</button>
        </div>

        {result && <p className="success-message"><CheckCircle weight="fill" /> {result.message} Carpeta: {result.outputDirectory}</p>}
        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

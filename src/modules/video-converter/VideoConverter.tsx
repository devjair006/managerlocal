import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, FilmStrip, MusicNotes, VideoCamera } from "@phosphor-icons/react";
import { ffmpegAvailable, pickMediaFile, pickMediaOutput, videoConverter, type MediaFormat } from "./video-converter.service";

interface Props { onBack: () => void; }
const formats: { id: MediaFormat; label: string; kind: "video" | "audio" | "image" }[] = [
  { id: "mp4", label: "MP4", kind: "video" }, { id: "webm", label: "WebM", kind: "video" }, { id: "gif", label: "GIF", kind: "image" },
  { id: "mp3", label: "MP3", kind: "audio" }, { id: "m4a", label: "M4A", kind: "audio" }, { id: "wav", label: "WAV", kind: "audio" },
];
function nameFromPath(path: string) { return path.split(/[\\/]/).pop() ?? path; }

export function VideoConverter({ onBack }: Props) {
  const [inputPath, setInputPath] = useState("");
  const [format, setFormat] = useState<MediaFormat>("mp4");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { void ffmpegAvailable().then(setAvailable); }, []);
  async function choose() { try { const path = await pickMediaFile(); if (path) { setInputPath(path); setResult(""); setError(""); } } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); } }
  async function convert() {
    if (!inputPath) return;
    setProcessing(true);
    try { const output = await pickMediaOutput(format); if (output) { setResult(await videoConverter({ inputPath, outputPath: output, format })); setError(""); } }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setProcessing(false); }
  }

  return <section className="tool-view">
    <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
    <div className="tool-heading"><span className="tool-heading-icon video-icon"><VideoCamera weight="duotone" /></span><div><p className="eyebrow">Multimedia</p><h1>Convertir audio y video</h1><p>Convierte formatos localmente utilizando FFmpeg.</p></div></div>
    <div className="file-tool-panel">
      <div className="runtime-status"><span className={available ? "runtime-dot ready" : "runtime-dot"} />{available === null ? "Comprobando FFmpeg..." : available ? "FFmpeg disponible" : "FFmpeg no encontrado"}</div>
      <button className="media-picker" onClick={() => void choose()}><FilmStrip weight="duotone" /><span><strong>{inputPath ? nameFromPath(inputPath) : "Seleccionar audio o video"}</strong><small>MP4, WebM, MOV, MKV, AVI, MP3, WAV, M4A, OGG o FLAC</small></span></button>
      <div className="format-grid">{formats.map((item) => <button key={item.id} className={format === item.id ? "media-format active" : "media-format"} onClick={() => { setFormat(item.id); setResult(""); }}>{item.kind === "audio" ? <MusicNotes /> : <VideoCamera />}<strong>{item.label}</strong><small>{item.kind}</small></button>)}</div>
      <div className="panel-footer"><span className="privacy-note">Los archivos se procesan localmente</span><button className="primary-button compact" disabled={!inputPath || !available || processing} onClick={() => void convert()}>{processing ? "Convirtiendo..." : `Convertir a ${format.toUpperCase()}`}</button></div>
      {result && <p className="success-message"><CheckCircle weight="fill" /> Guardado en {result}</p>}{error && <p className="error-text tool-error">{error}</p>}
    </div>
  </section>;
}

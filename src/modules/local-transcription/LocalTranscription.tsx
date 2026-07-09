import { useEffect, useState } from "react";
import { ArrowLeft, Check, Copy, FileAudio, Waveform } from "@phosphor-icons/react";
import { getTranscriptionRuntime, pickAudioFile, pickWhisperModel, transcribeLocal, type TranscriptionRuntime } from "./local-transcription.service";

interface Props { onBack: () => void; }

function name(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

export function LocalTranscription({ onBack }: Props) {
  const [runtime, setRuntime] = useState<TranscriptionRuntime | null>(null);
  const [audioPath, setAudioPath] = useState("");
  const [modelPath, setModelPath] = useState("");
  const [language, setLanguage] = useState("es");
  const [translate, setTranslate] = useState(false);
  const [text, setText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getTranscriptionRuntime().then(setRuntime).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, []);

  async function chooseAudio() {
    try {
      const selected = await pickAudioFile();
      if (selected) {
        setAudioPath(selected);
        setText("");
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function chooseModel() {
    try {
      const selected = await pickWhisperModel();
      if (selected) setModelPath(selected);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  async function run() {
    setProcessing(true);
    try {
      setText(await transcribeLocal({ audioPath, modelPath, language, translate }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setProcessing(false);
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon video-icon"><Waveform weight="duotone" /></span>
        <div>
          <p className="eyebrow">Multimedia</p>
          <h1>Transcripción local</h1>
          <p>Convierte audio o video a texto usando Whisper local.</p>
        </div>
      </div>

      <div className="runtime-status">
        <span className={runtime?.whisper ? "runtime-dot ready" : "runtime-dot"} />
        Whisper {runtime?.whisper ? `disponible (${runtime.executable})` : "no encontrado"}
      </div>

      <div className="file-tool-panel">
        <button className="media-picker" onClick={() => void chooseAudio()}>
          <FileAudio weight="duotone" />
          <span><strong>{audioPath ? name(audioPath) : "Seleccionar audio o video"}</strong><small>WAV, MP3, M4A, FLAC, MP4, MKV o WebM</small></span>
        </button>

        <button className="media-picker" onClick={() => void chooseModel()}>
          <Waveform weight="duotone" />
          <span><strong>{modelPath ? name(modelPath) : "Seleccionar modelo Whisper .bin"}</strong><small>Ejemplo: ggml-base.bin, ggml-small.bin o superior</small></span>
        </button>

        <div className="ocr-controls">
          <label>Idioma
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              <option value="es">Español</option>
              <option value="en">Inglés</option>
              <option value="auto">Auto detectar</option>
            </select>
          </label>
          <label className="inline-check">
            <input type="checkbox" checked={translate} onChange={(event) => setTranslate(event.target.checked)} />
            Traducir a inglés
          </label>
          <button className="primary-button compact" disabled={!runtime?.whisper || !audioPath || !modelPath || processing} onClick={() => void run()}>
            {processing ? "Transcribiendo..." : "Transcribir"}
          </button>
        </div>

        {!runtime?.whisper && <p className="tool-notice">Falta el ejecutable de Whisper/whisper.cpp. Para empaquetarlo bien lo agregaremos como sidecar junto con modelos permitidos por licencia.</p>}

        {text && <div className="ocr-result"><div><strong>Transcripción</strong><button onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar"}</button></div><textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} /></div>}
        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

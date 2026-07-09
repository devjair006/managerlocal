import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Copy, FileAudio, FloppyDisk, Waveform } from "@phosphor-icons/react";
import { OutputActions } from "../../components/OutputActions";
import { openResourceFolder } from "../dependency-center/resource-manager.service";
import { saveTextOutput } from "../../services/text-output";
import { getTranscriptionRuntime, pickAudioFile, pickWhisperModel, transcribeLocal, type TranscriptionRuntime } from "./local-transcription.service";

interface Props { onBack: () => void; }

function name(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
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
  const [savedPath, setSavedPath] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void getTranscriptionRuntime().then((status) => {
      setRuntime(status);
      if (!modelPath && status.bundledModels.length > 0) {
        setModelPath(status.bundledModels[0].path);
      }
    }).catch((cause) => setError(cause instanceof Error ? cause.message : String(cause)));
  }, [modelPath]);

  const selectedBundledModel = useMemo(
    () => runtime?.bundledModels.find((model) => model.path === modelPath),
    [modelPath, runtime?.bundledModels],
  );

  async function refreshRuntime() {
    try {
      const status = await getTranscriptionRuntime();
      setRuntime(status);
      if (!modelPath && status.bundledModels.length > 0) {
        setModelPath(status.bundledModels[0].path);
      }
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

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

  async function saveText() {
    try {
      const path = await saveTextOutput(text, "transcripcion.txt", "Texto", ["txt"]);
      if (path) setSavedPath(path);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
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

        {runtime?.bundledModels.length ? (
          <div className="model-list">
            <strong>Modelos empaquetados</strong>
            {runtime.bundledModels.map((model) => (
              <button key={model.path} className={model.path === modelPath ? "model-option active" : "model-option"} onClick={() => setModelPath(model.path)}>
                <span>{model.name}</span>
                <small>{formatBytes(model.sizeBytes)}</small>
              </button>
            ))}
          </div>
        ) : (
          <p className="tool-notice">No hay modelos empaquetados. Puedes agregar archivos .bin en <code>src-tauri\binaries\models</code> durante desarrollo o elegir uno manualmente.</p>
        )}

        <button className="media-picker" onClick={() => void chooseModel()}>
          <Waveform weight="duotone" />
          <span><strong>{modelPath ? name(modelPath) : "Seleccionar modelo Whisper .bin"}</strong><small>{selectedBundledModel ? "Modelo empaquetado seleccionado" : "Ejemplo: ggml-base.bin, ggml-small.bin o superior"}</small></span>
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

        <div className="dependency-actions transcription-actions">
          <button onClick={() => void refreshRuntime()}>Revisar Whisper/modelos</button>
          <button onClick={() => void openResourceFolder("binaries")}>Abrir carpeta de Whisper</button>
          {runtime?.modelsDirectory && <button onClick={() => void navigator.clipboard.writeText(runtime.modelsDirectory ?? "")}>Copiar carpeta de modelos</button>}
        </div>

        {!runtime?.whisper && <p className="tool-notice">Falta el ejecutable de Whisper/whisper.cpp. Empaquétalo como sidecar o colócalo en PATH.</p>}

        {text && <div className="ocr-result"><div><strong>Transcripción</strong><span><button onClick={() => void copy()}>{copied ? <Check /> : <Copy />}{copied ? "Copiado" : "Copiar"}</button><button onClick={() => void saveText()}><FloppyDisk /> Guardar TXT</button></span></div><textarea value={text} onChange={(event) => setText(event.target.value)} spellCheck={false} /></div>}
        {savedPath && <OutputActions path={savedPath} />}
        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

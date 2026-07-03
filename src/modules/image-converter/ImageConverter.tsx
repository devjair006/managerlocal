import { useRef, useState } from "react";
import { ArrowLeft, DownloadSimple, ImageSquare, UploadSimple } from "@phosphor-icons/react";
import { imageConverter, type ImageFormat } from "./image-converter.service";

interface Props { onBack: () => void; }

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export function ImageConverter({ onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [fileName, setFileName] = useState("imagen");
  const [format, setFormat] = useState<ImageFormat>("webp");
  const [quality, setQuality] = useState(88);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  async function selectFile(file?: File) {
    if (!file?.type.startsWith("image/")) {
      setError("Selecciona un archivo PNG, JPG o WebP");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError("La imagen no puede superar 25 MB");
      return;
    }
    setOriginal(await readFile(file));
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setResult("");
    setError("");
  }

  async function convert() {
    if (!original) return;
    setProcessing(true);
    try {
      setResult(await imageConverter({ imageData: original, format, quality }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo convertir la imagen");
    } finally {
      setProcessing(false);
    }
  }

  function download() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result;
    anchor.download = `${fileName}.${format}`;
    anchor.click();
  }

  return (
    <section className="tool-view background-tool">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading"><span className="tool-heading-icon converter-icon"><ImageSquare weight="duotone" /></span><div><p className="eyebrow">Imágenes</p><h1>Convertir imágenes</h1><p>Convierte PNG, JPG y WebP localmente, sin subir archivos.</p></div></div>

      {!original ? (
        <button className="image-dropzone" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }}>
          <span className="drop-icon"><UploadSimple weight="duotone" /></span><strong>Elige o arrastra una imagen</strong><span>PNG, JPG o WebP · máximo 25 MB</span>
        </button>
      ) : (
        <div className="background-workspace">
          <div className="image-comparison"><figure><figcaption>Original</figcaption><div className="image-stage"><img src={original} alt="Imagen original" /></div></figure><figure><figcaption>Resultado</figcaption><div className="image-stage checkerboard">{result ? <img src={result} alt="Imagen convertida" /> : <span>Convierte para ver el resultado</span>}</div></figure></div>
          <div className="converter-controls">
            <div className="format-group"><span>Formato de salida</span>{(["png", "jpg", "webp"] as ImageFormat[]).map((item) => <button key={item} className={format === item ? "format-option active" : "format-option"} onClick={() => { setFormat(item); setResult(""); }}>{item.toUpperCase()}</button>)}</div>
            <div className="quality-control"><label htmlFor="convert-quality">Calidad {format !== "jpg" && "(sin pérdida)"}</label><output>{format === "jpg" ? `${quality}%` : "Máxima"}</output><input id="convert-quality" type="range" min="40" max="100" value={quality} disabled={format !== "jpg"} onChange={(event) => setQuality(Number(event.target.value))} /></div>
            <div className="background-actions"><button className="secondary-button" onClick={() => inputRef.current?.click()}>Cambiar imagen</button><button className="primary-button compact" disabled={processing} onClick={() => void convert()}>{processing ? "Convirtiendo..." : "Convertir"}</button><button className="primary-button compact" disabled={!result} onClick={download}><DownloadSimple weight="bold" />Guardar</button></div>
          </div>
        </div>
      )}
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void selectFile(event.target.files?.[0])} />
      {error && <p className="error-text tool-error">{error}</p>}
    </section>
  );
}

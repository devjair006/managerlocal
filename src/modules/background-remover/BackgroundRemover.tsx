import { useRef, useState } from "react";
import { ArrowLeft, DownloadSimple, ImageSquare, MagicWand, UploadSimple } from "@phosphor-icons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { removeWhiteBackground } from "./background.service";

interface Props { onBack: () => void; }

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export function BackgroundRemover({ onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [fileName, setFileName] = useState("imagen");
  const [tolerance, setTolerance] = useState(18);
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");

  async function selectFile(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
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

  async function processImage() {
    if (!original) return;
    setProcessing(true);
    try {
      setResult(await removeWhiteBackground({ imageData: original, tolerance }));
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo procesar la imagen");
    } finally {
      setProcessing(false);
    }
  }

  function download() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result;
    anchor.download = `${fileName}-sin-fondo.png`;
    anchor.click();
  }

  return (
    <section className="tool-view background-tool">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <ToolPixelIcon toolId="background-remover" className="background-icon" />
        <div><p className="eyebrow">Imágenes</p><h1>Quitar fondo blanco</h1><p>Elimina tonos blancos localmente y conserva el resultado como PNG.</p></div>
      </div>

      {!original ? (
        <button
          className={dragging ? "image-dropzone dragging" : "image-dropzone"}
          onClick={() => inputRef.current?.click()}
          onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => { event.preventDefault(); setDragging(false); void selectFile(event.dataTransfer.files[0]); }}
        >
          <span className="drop-icon"><UploadSimple weight="duotone" /></span>
          <strong>Arrastra una imagen aquí</strong>
          <span>o haz clic para elegir · PNG, JPG o WebP · máximo 25 MB</span>
        </button>
      ) : (
        <div className="background-workspace">
          <div className="image-comparison">
            <figure><figcaption>Original</figcaption><div className="image-stage"><img src={original} alt="Imagen original" /></div></figure>
            <figure><figcaption>Resultado</figcaption><div className="image-stage checkerboard">{result ? <img src={result} alt="Imagen sin fondo blanco" /> : <div className="result-placeholder"><ImageSquare /><span>Procesa para ver el resultado</span></div>}</div></figure>
          </div>
          <div className="background-controls">
            <div><label htmlFor="white-tolerance">Tolerancia del blanco</label><p>Auméntala si el fondo contiene grises claros.</p></div>
            <output>{tolerance}</output>
            <input id="white-tolerance" type="range" min="2" max="80" value={tolerance} onChange={(event) => setTolerance(Number(event.target.value))} />
            <div className="background-actions">
              <button className="secondary-button" onClick={() => inputRef.current?.click()}>Cambiar imagen</button>
              <button className="primary-button compact" disabled={processing} onClick={() => void processImage()}><MagicWand weight="bold" />{processing ? "Procesando..." : "Quitar fondo"}</button>
              <button className="primary-button compact" disabled={!result} onClick={download}><DownloadSimple weight="bold" />Guardar PNG</button>
            </div>
          </div>
        </div>
      )}
      <input ref={inputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => void selectFile(event.target.files?.[0])} />
      {error && <p className="error-text tool-error">{error}</p>}
    </section>
  );
}

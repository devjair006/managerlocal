import { useRef, useState } from "react";
import { ArrowLeft, DownloadSimple, Resize } from "@phosphor-icons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { imageResizer } from "./image-resizer.service";

interface Props {
  onBack: () => void;
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

export function ImageResizer({ onBack }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(800);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("imagen");
  const [keepRatio, setKeepRatio] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(1);

  async function selectFile(file?: File) {
    if (!file?.type.startsWith("image/")) {
      setError("Selecciona un archivo PNG, JPG o WebP");
      return;
    }
    const data = await readFile(file);
    const image = new Image();
    image.src = data;
    await image.decode();
    setOriginal(data);
    setWidth(image.naturalWidth);
    setHeight(image.naturalHeight);
    setAspectRatio(image.naturalWidth / image.naturalHeight);
    setFileName(file.name.replace(/\.[^.]+$/, ""));
    setResult("");
    setError("");
  }

  function changeWidth(nextWidth: number) {
    setWidth(nextWidth);
    if (keepRatio) setHeight(Math.max(1, Math.round(nextWidth / aspectRatio)));
    setResult("");
  }

  function changeHeight(nextHeight: number) {
    setHeight(nextHeight);
    if (keepRatio) setWidth(Math.max(1, Math.round(nextHeight * aspectRatio)));
    setResult("");
  }

  function download() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result;
    anchor.download = `${fileName}-${width}x${height}.png`;
    anchor.click();
  }

  async function handleResize() {
    if (!original) return;
    setProcessing(true);
    try {
      setResult(await imageResizer({ imageData: original, width, height }));
      setError("");
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No se pudo redimensionar la imagen";
      console.error("imageResizer failed:", cause);
      setError(message);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <section className="tool-view background-tool">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <ToolPixelIcon toolId="image-resizer" />
        <div>
          <p className="eyebrow">Imágenes</p>
          <h1>Redimensionar</h1>
          <p>Cambia medidas y peso conservando la mejor calidad posible.</p>
        </div>
      </div>

      {!original ? (
        <button className="image-dropzone" onClick={() => inputRef.current?.click()}>
          <strong>Elige una imagen para redimensionar</strong>
          <span>PNG, JPG o WebP · máximo 25 MB</span>
        </button>
      ) : (
        <div className="background-workspace">
          <div className="image-comparison">
            <figure>
              <figcaption>Original</figcaption>
              <div className="image-stage"><img src={original} alt="Imagen original" /></div>
            </figure>
            <figure>
              <figcaption>Resultado</figcaption>
              <div className="image-stage checkerboard">
                {result ? <img src={result} alt="Imagen redimensionada" /> : <span>Procesa para ver el resultado</span>}
              </div>
            </figure>
          </div>
          <div className="background-controls">
            <div><label htmlFor="resize-width">Ancho (px)</label></div>
            <output>{width}px</output>
            <input id="resize-width" type="number" min="1" max="10000" value={width} onChange={(event) => changeWidth(Number(event.target.value))} />
            <div><label htmlFor="resize-height">Alto (px)</label></div>
            <output>{height}px</output>
            <input id="resize-height" type="number" min="1" max="10000" value={height} onChange={(event) => changeHeight(Number(event.target.value))} />
            <label className="ratio-toggle"><input type="checkbox" checked={keepRatio} onChange={(event) => setKeepRatio(event.target.checked)} /> Mantener proporción</label>
            <div className="background-actions">
              <button className="secondary-button" onClick={() => inputRef.current?.click()}>Cambiar imagen</button>
              <button className="primary-button compact" disabled={processing} onClick={() => void handleResize()}>
                {processing ? "Procesando..." : "Redimensionar"}
              </button>
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

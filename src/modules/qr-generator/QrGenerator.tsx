import { useEffect, useState } from "react";
import { ArrowLeft, DownloadSimple, QrCode } from "@phosphor-icons/react";
import { generateQr } from "./qr.service";

interface Props {
  onBack: () => void;
}

export function QrGenerator({ onBack }: Props) {
  const [content, setContent] = useState("https://");
  const [size, setSize] = useState(320);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      if (!content.trim()) {
        setResult("");
        return;
      }
      try {
        setResult(await generateQr({ content: content.trim(), size }));
        setError("");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "No se pudo generar el QR");
      }
    }, 180);
    return () => window.clearTimeout(timeout);
  }, [content, size]);

  function download() {
    if (!result) return;
    const anchor = document.createElement("a");
    anchor.href = result;
    anchor.download = "codigo-qr.png";
    anchor.click();
  }

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon"><QrCode weight="duotone" /></span>
        <div><p className="eyebrow">Productividad</p><h1>Generador QR</h1><p>Crea códigos QR localmente. Ningún dato sale de tu equipo.</p></div>
      </div>
      <div className="qr-workspace">
        <div className="qr-form">
          <label htmlFor="qr-content">Enlace o texto</label>
          <textarea id="qr-content" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escribe algo..." autoFocus />
          <div className="range-row"><label htmlFor="qr-size">Tamaño</label><output>{size} px</output></div>
          <input id="qr-size" type="range" min="180" max="640" step="20" value={size} onChange={(event) => setSize(Number(event.target.value))} />
          <p className="privacy-note">Procesamiento 100% local · Sin cuentas · Sin anuncios</p>
        </div>
        <div className="qr-preview">
          <div className="qr-canvas">{result ? <img src={result} alt="Código QR generado" /> : <span>Escribe contenido para generar</span>}</div>
          {error && <p className="error-text">{error}</p>}
          <button className="primary-button" disabled={!result} onClick={download}><DownloadSimple weight="bold" /> Guardar PNG</button>
        </div>
      </div>
    </section>
  );
}

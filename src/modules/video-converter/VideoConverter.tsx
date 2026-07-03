import { useState } from "react";
import { ArrowLeft, VideoCamera } from "@phosphor-icons/react";
// import { videoConverter } from "./video-converter.service.ts";

interface Props {
  onBack: () => void;
}

export function VideoConverter({ onBack }: Props) {
  const [error, setError] = useState("");

  async function handleAction() {
    try {
      setError("");
      // TODO: conectar con el servicio
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo completar la acción");
    }
  }

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon"><VideoCamera weight="duotone" /></span>
        <div>
          <p className="eyebrow">Multimedia</p>
          <h1>Convertir video</h1>
          <p>Convierte formatos de audio y video usando FFmpeg.</p>
        </div>
      </div>

      <div className="qr-form">
        <p className="privacy-note">Procesamiento 100% local · Sin cuentas · Sin anuncios</p>
        <button className="primary-button" onClick={() => void handleAction()}>Empezar</button>
        {error && <p className="error-text">{error}</p>}
      </div>
    </section>
  );
}

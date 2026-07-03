import { useState } from "react";
import { ArrowLeft, ImageSquare } from "@phosphor-icons/react";
// import { imageConverter } from "./image-converter.service.ts";

interface Props {
  onBack: () => void;
}

export function ImageConverter({ onBack }: Props) {
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
        <span className="tool-heading-icon"><ImageSquare weight="duotone" /></span>
        <div>
          <p className="eyebrow">Imágenes</p>
          <h1>Convertir imágenes</h1>
          <p>Convierte PNG, JPG y WebP de forma local y por lotes.</p>
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

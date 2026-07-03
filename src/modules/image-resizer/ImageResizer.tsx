import { useState } from "react";
import { ArrowLeft, Resize } from "@phosphor-icons/react";
// import { imageResizer } from "./image-resizer.service.ts";

interface Props {
  onBack: () => void;
}

export function ImageResizer({ onBack }: Props) {
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
        <span className="tool-heading-icon"><Resize weight="duotone" /></span>
        <div>
          <p className="eyebrow">Imágenes</p>
          <h1>Redimensionar</h1>
          <p>Cambia medidas y peso conservando la mejor calidad posible.</p>
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

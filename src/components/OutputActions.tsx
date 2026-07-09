import { ArrowSquareOut, CheckCircle, FolderOpen } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { openPath, revealPath } from "../services/file-actions";
import { recordOutput } from "../services/output-history";

type Props = {
  path: string;
  label?: string;
  directory?: boolean;
};

export function OutputActions({ path, label = "Guardado en", directory = false }: Props) {
  const [error, setError] = useState("");

  useEffect(() => {
    recordOutput({ path, label, directory });
  }, [directory, label, path]);

  async function run(action: () => Promise<void>) {
    try {
      await action();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  return (
    <div className="output-actions">
      <p className="success-message"><CheckCircle weight="fill" /> {label} {path}</p>
      <div>
        <button onClick={() => void run(() => openPath(path))}><ArrowSquareOut /> {directory ? "Abrir carpeta" : "Abrir"}</button>
        <button onClick={() => void run(() => revealPath(path))}><FolderOpen /> Mostrar ubicación</button>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

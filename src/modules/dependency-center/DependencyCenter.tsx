import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, ClipboardText, FolderOpen, Package, PlugsConnected, WarningCircle } from "@phosphor-icons/react";
import { ToolPixelIcon } from "../../components/ToolPixelIcon";
import { getDependencyCenterStatus, type DependencyStatus } from "./dependency-center.service";
import { getResourceManagerStatus, openResourceFolder, type ResourceManagerStatus } from "./resource-manager.service";

interface Props { onBack: () => void; }

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function DependencyCenter({ onBack }: Props) {
  const [items, setItems] = useState<DependencyStatus[]>([]);
  const [resources, setResources] = useState<ResourceManagerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedAction, setCopiedAction] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const [dependencyItems, resourceStatus] = await Promise.all([
        getDependencyCenterStatus(),
        getResourceManagerStatus(),
      ]);
      setItems(dependencyItems);
      setResources(resourceStatus);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  async function copyText(actionId: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedAction(actionId);
      window.setTimeout(() => setCopiedAction(""), 1700);
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  }

  async function openFolder(kind: "binaries" | "models" | "tessdata") {
    try {
      await openResourceFolder(kind);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    }
  }

  useEffect(() => { void refresh(); }, []);

  const summary = useMemo(() => {
    const ready = items.filter((item) => item.available).length;
    return { ready, missing: Math.max(0, items.length - ready), total: items.length };
  }, [items]);

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <ToolPixelIcon toolId="dependency-center" className="dependency-icon" />
        <div>
          <p className="eyebrow">Sistema</p>
          <h1>Centro de dependencias</h1>
          <p>Verifica motores locales, carpetas de sidecars y modelos empaquetables.</p>
        </div>
      </div>

      <div className="dependency-summary">
        <span><strong>{summary.ready}</strong> disponibles</span>
        <span><strong>{summary.missing}</strong> pendientes</span>
        <span><strong>{summary.total}</strong> motores</span>
        <button className="secondary-button" disabled={loading} onClick={() => void refresh()}>{loading ? "Revisando..." : "Revisar de nuevo"}</button>
      </div>

      {resources && (
        <section className="resource-panel">
          <div className="resource-panel-head">
            <div>
              <strong>Recursos empaquetables</strong>
              <span>Carpetas donde la app busca motores, OCR y modelos locales. Los botones abren ubicaciones escribibles del usuario.</span>
            </div>
            <div className="dependency-actions">
              <button onClick={() => void openFolder("binaries")}><FolderOpen /> Binarios</button>
              <button onClick={() => void openFolder("models")}><FolderOpen /> Modelos</button>
              <button onClick={() => void openFolder("tessdata")}><FolderOpen /> Tessdata</button>
            </div>
          </div>

          <div className="resource-grid">
            <span><strong>{resources.sidecarFiles.length}</strong> sidecars detectados<small>{resources.binariesDirectory}</small></span>
            <span><strong>Usuario</strong> recursos editables<small>{resources.userBinariesDirectory}</small></span>
            <span><strong>{resources.modelFiles.length}</strong> modelos Whisper<small>{resources.modelsDirectory}</small></span>
            <span><strong>{resources.tessdataDirectory ? "OK" : "Falta"}</strong> OCR idiomas<small>{resources.tessdataDirectory ?? "Sin tessdata detectado"}</small></span>
          </div>

          <div className="resource-actions-row">
            <button onClick={() => void copyText("script:sidecars", "powershell -ExecutionPolicy Bypass -File scripts\\prepare-sidecars.ps1")}><ClipboardText /> {copiedAction === "script:sidecars" ? "Copiado" : "Copiar preparar sidecars"}</button>
            <button onClick={() => void copyText("script:whisper", "powershell -ExecutionPolicy Bypass -File scripts\\download-whisper-model.ps1 -Model base")}><ClipboardText /> {copiedAction === "script:whisper" ? "Copiado" : "Copiar descargar Whisper base"}</button>
            <button onClick={() => void copyText("script:rembg", "powershell -ExecutionPolicy Bypass -File scripts\\install-rembg.ps1 -InstallPython")}><ClipboardText /> {copiedAction === "script:rembg" ? "Copiado" : "Copiar instalar rembg"}</button>
          </div>

          {resources.modelFiles.length > 0 && (
            <div className="resource-file-list">
              {resources.modelFiles.slice(0, 5).map((file) => <span key={file.path}>{file.name}<small>{formatBytes(file.sizeBytes)}</small></span>)}
            </div>
          )}
        </section>
      )}

      <div className="dependency-grid">
        {items.map((item) => {
          const installAction = `${item.id}:install`;
          const pathAction = `${item.id}:path`;
          const packageAction = `${item.id}:package`;

          return (
            <article key={item.id} className={item.available ? "dependency-card ready" : "dependency-card missing"}>
              <div className="dependency-card-head">
                <span>{item.available ? <CheckCircle weight="fill" /> : <WarningCircle weight="fill" />}</span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.available ? item.executable ?? "Disponible" : "No encontrado"}</small>
                </div>
                <em>{item.available ? "OK" : "Falta"}</em>
              </div>

              {item.version && <p className="dependency-version">{item.version}</p>}
              <p>{item.requiredFor}</p>
              <div className="dependency-tags">{item.usedBy.map((tool) => <span key={tool}>{tool}</span>)}</div>

              <div className="dependency-actions">
                {!item.available && (
                  <button onClick={() => void copyText(installAction, item.installHint)}>
                    <ClipboardText /> {copiedAction === installAction ? "Copiado" : "Copiar instalación"}
                  </button>
                )}
                {item.executable && (
                  <button onClick={() => void copyText(pathAction, item.executable ?? "")}>
                    <ClipboardText /> {copiedAction === pathAction ? "Copiado" : "Copiar ruta"}
                  </button>
                )}
                <button onClick={() => void copyText(packageAction, item.packagingHint)}>
                  <ClipboardText /> {copiedAction === packageAction ? "Copiado" : "Copiar empaquetado"}
                </button>
              </div>

              {!item.available && <code>{item.installHint}</code>}
              <details>
                <summary>Empaquetamiento</summary>
                <p>{item.packagingHint}</p>
              </details>
            </article>
          );
        })}
      </div>

      {!loading && !items.length && <div className="empty-state compact-empty"><Package /><strong>No se pudo cargar el diagnóstico</strong><span>Revisa que estés ejecutando la app de escritorio.</span></div>}
      {error && <p className="error-text tool-error">{error}</p>}
    </section>
  );
}

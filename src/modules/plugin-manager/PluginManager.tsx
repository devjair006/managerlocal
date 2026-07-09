import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle, Cube, Plug, ShieldCheck, ShieldWarning, WarningCircle } from "@phosphor-icons/react";
import { getPluginSystemStatus, scanLocalPlugins, type PluginAudit, type PluginSystemStatus } from "./plugin-manager.service";

interface Props { onBack: () => void; }

function signatureLabel(status: PluginAudit["signatureStatus"]) {
  switch (status) {
    case "trusted": return "Firma confiable";
    case "unsigned": return "Sin firma";
    case "untrusted": return "Firma no confiable";
    default: return "Inválido";
  }
}

export function PluginManager({ onBack }: Props) {
  const [status, setStatus] = useState<PluginSystemStatus | null>(null);
  const [plugins, setPlugins] = useState<PluginAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      const [nextStatus, nextPlugins] = await Promise.all([getPluginSystemStatus(), scanLocalPlugins()]);
      setStatus(nextStatus);
      setPlugins(nextPlugins);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void refresh(); }, []);

  return (
    <section className="tool-view">
      <button className="back-button" onClick={onBack}><ArrowLeft /> Volver a herramientas</button>
      <div className="tool-heading">
        <span className="tool-heading-icon plugin-icon"><Plug weight="duotone" /></span>
        <div>
          <p className="eyebrow">Arquitectura</p>
          <h1>Plugins seguros</h1>
          <p>Audita plugins locales antes de permitir que se ejecuten dentro de Manager Local.</p>
        </div>
      </div>

      <div className="file-tool-panel">
        <div className="plugin-status-card">
          <ShieldCheck weight="duotone" />
          <div>
            <strong>Política actual</strong>
            <span>{status?.policy ?? "Cargando política..."}</span>
            {status && <small>Carpeta: {status.pluginsDirectory}</small>}
          </div>
        </div>

        <div className="panel-footer">
          <span className="privacy-note">{status?.trustedPublishers ?? 0} publicador(es) confiable(s) configurado(s)</span>
          <button className="primary-button compact" onClick={() => void refresh()} disabled={loading}>{loading ? "Escaneando..." : "Escanear plugins"}</button>
        </div>

        <p className="tool-notice">
          Formato esperado: una carpeta por plugin dentro de la ruta anterior, cada una con <code>managerlocal.plugin.json</code>. Por ahora solo auditamos; ejecutar plugins vendrá después de cerrar permisos y sandbox.
        </p>

        <div className="plugin-list">
          {!loading && plugins.length === 0 && <div className="empty-state compact-empty"><Cube /><strong>No hay plugins instalados</strong><span>Crea una carpeta de plugin con su manifiesto para verla aquí.</span></div>}
          {plugins.map((plugin) => (
            <article key={`${plugin.id}-${plugin.directory}`} className={plugin.runnable ? "plugin-card ready" : "plugin-card blocked"}>
              <div className="plugin-card-header">
                <span>{plugin.runnable ? <CheckCircle weight="fill" /> : <ShieldWarning weight="fill" />}</span>
                <div>
                  <strong>{plugin.name}</strong>
                  <small>{plugin.id} · v{plugin.version} · {plugin.author}</small>
                </div>
                <em>{plugin.runnable ? "Permitido" : "Bloqueado"}</em>
              </div>
              <p>{plugin.description}</p>
              <div className="plugin-meta">
                <span>{signatureLabel(plugin.signatureStatus)}</span>
                <span>Entrada: {plugin.entry}</span>
              </div>
              {plugin.permissions.length > 0 && (
                <div className="permission-list">
                  <strong>Permisos solicitados</strong>
                  {plugin.permissions.map((permission) => <span key={permission.id}><b>{permission.id}</b>{permission.reason}</span>)}
                </div>
              )}
              {plugin.issues.length > 0 && (
                <div className="plugin-issues">
                  {plugin.issues.map((issue) => <span key={issue}><WarningCircle /> {issue}</span>)}
                </div>
              )}
            </article>
          ))}
        </div>

        {error && <p className="error-text tool-error">{error}</p>}
      </div>
    </section>
  );
}

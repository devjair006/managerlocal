import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle, Package, PlugsConnected, WarningCircle } from "@phosphor-icons/react";
import { getDependencyCenterStatus, type DependencyStatus } from "./dependency-center.service";

interface Props { onBack: () => void; }

export function DependencyCenter({ onBack }: Props) {
  const [items, setItems] = useState<DependencyStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    try {
      setItems(await getDependencyCenterStatus());
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
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
        <span className="tool-heading-icon dependency-icon"><PlugsConnected weight="duotone" /></span>
        <div>
          <p className="eyebrow">Sistema</p>
          <h1>Centro de dependencias</h1>
          <p>Verifica los motores locales que hacen funcionar las herramientas avanzadas.</p>
        </div>
      </div>

      <div className="dependency-summary">
        <span><strong>{summary.ready}</strong> disponibles</span>
        <span><strong>{summary.missing}</strong> pendientes</span>
        <span><strong>{summary.total}</strong> motores</span>
        <button className="secondary-button" disabled={loading} onClick={() => void refresh()}>{loading ? "Revisando..." : "Revisar de nuevo"}</button>
      </div>

      <div className="dependency-grid">
        {items.map((item) => (
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
            {!item.available && <code>{item.installHint}</code>}
            <details>
              <summary>Empaquetamiento</summary>
              <p>{item.packagingHint}</p>
            </details>
          </article>
        ))}
      </div>

      {!loading && !items.length && <div className="empty-state compact-empty"><Package /><strong>No se pudo cargar el diagnóstico</strong><span>Revisa que estés ejecutando la app de escritorio.</span></div>}
      {error && <p className="error-text tool-error">{error}</p>}
    </section>
  );
}

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowSquareOut,
  ClockCounterClockwise,
  FolderOpen,
  GearSix,
  MagnifyingGlass,
  PlugsConnected,
  Star,
  SquaresFour,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import logo from "./assets/logoManagerTools.png";
import { getDependencyCenterStatus, type DependencyStatus } from "./modules/dependency-center/dependency-center.service";
import { categories, tools } from "./modules/registry";
import { hasToolView, lazyToolViews } from "./modules/tool-routes";
import { WindowControls } from "./components/WindowControls";
import { clearRecentOutputs, listenToRecentOutputs, loadRecentOutputs, type RecentOutput } from "./services/output-history";
import { openPath, revealPath } from "./services/file-actions";

const FAVORITES_STORAGE_KEY = "managerlocal.favoriteTools";
const RECENTS_STORAGE_KEY = "managerlocal.recentTools";
const MAX_RECENTS = 8;

async function handleTitlebarMouseDown(event: React.MouseEvent<HTMLElement>) {
  if (!("__TAURI_INTERNALS__" in window) || event.button !== 0) return;

  const target = event.target as HTMLElement;
  if (target.closest("button")) return;

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();

  if (event.detail === 2) {
    await appWindow.toggleMaximize();
  } else {
    await appWindow.startDragging();
  }
}

function loadStringList(key: string): string[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function outputName(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function outputTime(createdAt: number) {
  return new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" }).format(createdAt);
}

export function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opacity, setOpacity] = useState(100);
  const [section, setSection] = useState<"all" | "recent" | "favorites">("all");
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadStringList(FAVORITES_STORAGE_KEY));
  const [recentIds, setRecentIds] = useState<string[]>(() => loadStringList(RECENTS_STORAGE_KEY));
  const [recentOutputs, setRecentOutputs] = useState<RecentOutput[]>(() => loadRecentOutputs());
  const [dependencyStatus, setDependencyStatus] = useState<DependencyStatus[]>([]);
  const [dependencyError, setDependencyError] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favoriteIds));
  }, [favoriteIds]);

  useEffect(() => {
    window.localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recentIds));
  }, [recentIds]);

  useEffect(() => listenToRecentOutputs(setRecentOutputs), []);

  useEffect(() => {
    function handleKeyboard(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setActiveTool(null);
        searchInputRef.current?.focus();
      }

      if (event.key === "Escape" && !activeTool) {
        setSearch("");
      }
    }

    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [activeTool]);

  useEffect(() => {
    if (!("__TAURI_INTERNALS__" in window)) return;

    const loadDependencies = () => {
      void getDependencyCenterStatus()
        .then((items) => {
          setDependencyStatus(items);
          setDependencyError("");
        })
        .catch((cause) => setDependencyError(cause instanceof Error ? cause.message : String(cause)));
    };

    const idleId = window.requestIdleCallback?.(loadDependencies, { timeout: 2500 });
    const timeoutId = idleId === undefined ? window.setTimeout(loadDependencies, 1500) : undefined;

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId);
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
    };
  }, []);

  const toolsById = useMemo(() => new Map(tools.map((tool) => [tool.id, tool])), []);

  function openTool(toolId: string) {
    if (!hasToolView(toolId)) return;
    setActiveTool(toolId);
    setRecentIds((current) => [toolId, ...current.filter((id) => id !== toolId)].slice(0, MAX_RECENTS));
  }

  function toggleFavorite(toolId: string) {
    setFavoriteIds((current) => current.includes(toolId) ? current.filter((id) => id !== toolId) : [toolId, ...current]);
  }

  const filteredTools = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === "Todas" || tool.category === category;
    const matchesSection = section === "all" || (section === "recent" ? recentIds.includes(tool.id) : favoriteIds.includes(tool.id));
    const needle = search.trim().toLocaleLowerCase();
    const matchesSearch = !needle || `${tool.name} ${tool.description} ${tool.category}`.toLocaleLowerCase().includes(needle);
    return matchesCategory && matchesSection && matchesSearch;
  }).sort((a, b) => {
    if (section === "recent") return recentIds.indexOf(a.id) - recentIds.indexOf(b.id);
    if (section === "favorites") return favoriteIds.indexOf(a.id) - favoriteIds.indexOf(b.id);
    const aFavorite = favoriteIds.includes(a.id) ? 1 : 0;
    const bFavorite = favoriteIds.includes(b.id) ? 1 : 0;
    return bFavorite - aFavorite;
  }), [category, favoriteIds, recentIds, search, section]);

  const recentTools = recentIds.map((id) => toolsById.get(id)).filter(Boolean).slice(0, 4);
  const favoriteTools = favoriteIds.map((id) => toolsById.get(id)).filter(Boolean).slice(0, 4);
  const availableToolsCount = tools.filter((tool) => tool.status === "available" && hasToolView(tool.id)).length;
  const readyDependencies = dependencyStatus.filter((item) => item.available);
  const missingDependencies = dependencyStatus.filter((item) => !item.available);
  const importantMissingDependencies = missingDependencies.filter((item) => ["whisper", "rembg", "ghostscript"].includes(item.id)).slice(0, 3);
  const ActiveTool = activeTool && hasToolView(activeTool) ? lazyToolViews[activeTool] : null;

  const pageTitle = section === "recent" ? "Recientes" : section === "favorites" ? "Favoritos" : "Todas las herramientas";
  const pageDescription = section === "recent"
    ? "Tus últimas herramientas usadas, listas para repetir tareas."
    : section === "favorites"
      ? "Accesos rápidos marcados por ti para trabajo diario."
      : "Utilidades rápidas, sin subir tus archivos a internet.";

  return (
    <div className="desktop-stage" style={{ "--panel-opacity": opacity / 100 } as React.CSSProperties}>
      <div className="app-window">
        <header className="titlebar" data-tauri-drag-region onMouseDown={(event) => void handleTitlebarMouseDown(event)}>
          <div className="brand" data-tauri-drag-region>
            <img className="brand-logo" src={logo} alt="" data-tauri-drag-region />
            <strong data-tauri-drag-region>Manager Local</strong>
          </div>
          <div className="titlebar-drag-area" data-tauri-drag-region><span className="local-badge" data-tauri-drag-region>Todo permanece en tu equipo</span></div>
          <WindowControls />
        </header>

        <div className="app-body">
          <aside className="sidebar">
            <nav>
              <button className={!activeTool && section === "all" ? "nav-item active" : "nav-item"} onClick={() => { setSection("all"); setCategory("Todas"); setActiveTool(null); }}><SquaresFour weight="fill" /> Herramientas</button>
              <button className={!activeTool && section === "recent" ? "nav-item active" : "nav-item"} onClick={() => { setSection("recent"); setCategory("Todas"); setActiveTool(null); }}><ClockCounterClockwise /> Recientes</button>
              <button className={!activeTool && section === "favorites" ? "nav-item active" : "nav-item"} onClick={() => { setSection("favorites"); setCategory("Todas"); setActiveTool(null); }}><Star /> Favoritos</button>
            </nav>

            <div className="sidebar-section">
              <p>Categorías</p>
              {categories.map((item) => (
                <button key={item} className={category === item ? "category active" : "category"} onClick={() => { setCategory(item); setSection("all"); setActiveTool(null); }}>{item}</button>
              ))}
            </div>

            <button className="nav-item settings-link" onClick={() => setSettingsOpen(true)}><GearSix /> Configuración</button>
          </aside>

          <main className="content">
            {ActiveTool ? (
              <Suspense fallback={<div className="tool-loading"><span className="tool-loading-spinner" aria-hidden="true" /><p>Cargando herramienta...</p></div>}>
                <ActiveTool onBack={() => setActiveTool(null)} />
              </Suspense>
            ) : (
              <>
                <div className="content-header">
                  <div>
                    <p className="eyebrow">Tu espacio privado</p>
                    <h1>{pageTitle}</h1>
                    <p>{pageDescription}</p>
                  </div>
                  <div className="search">
                    <MagnifyingGlass />
                    <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar herramienta..." />
                    <kbd>Ctrl K</kbd>
                  </div>
                </div>

                <div className="dashboard-strip">
                  <span><strong>{availableToolsCount}</strong> módulos activos</span>
                  <span><strong>{favoriteIds.length}</strong> favoritos</span>
                  <span><strong>{recentIds.length}</strong> recientes</span>
                  <span><strong>{recentOutputs.length}</strong> salidas</span>
                </div>

                {section === "all" && !search && (
                  <section className={missingDependencies.length ? "health-card warning" : "health-card ready"}>
                    <div className="health-icon">{missingDependencies.length ? <WarningCircle weight="fill" /> : <PlugsConnected weight="duotone" />}</div>
                    <div className="health-copy">
                      <strong>{dependencyStatus.length ? `${readyDependencies.length}/${dependencyStatus.length} motores locales listos` : "Diagnóstico local pendiente"}</strong>
                      <span>
                        {dependencyError
                          ? "No se pudo consultar el centro de dependencias en esta sesión."
                          : missingDependencies.length
                            ? `Faltan ${missingDependencies.length} motores. Revisa esto antes de usar IA, transcripción o PDF avanzado.`
                            : "Las herramientas avanzadas detectadas están listas para trabajar localmente."}
                      </span>
                      {importantMissingDependencies.length > 0 && (
                        <div className="health-tags">
                          {importantMissingDependencies.map((item) => <span key={item.id}>{item.name}</span>)}
                        </div>
                      )}
                    </div>
                    <button className="secondary-button" onClick={() => openTool("dependency-center")}>Abrir centro</button>
                  </section>
                )}

                {(favoriteTools.length > 0 || recentTools.length > 0) && section === "all" && !search && (
                  <div className="quick-access">
                    {favoriteTools.length > 0 && <div><strong>Favoritos</strong><div>{favoriteTools.map((tool) => tool && <button key={tool.id} onClick={() => openTool(tool.id)}>{tool.name}</button>)}</div></div>}
                    {recentTools.length > 0 && <div><strong>Recientes</strong><div>{recentTools.map((tool) => tool && <button key={tool.id} onClick={() => openTool(tool.id)}>{tool.name}</button>)}</div></div>}
                  </div>
                )}

                {recentOutputs.length > 0 && section === "all" && !search && (
                  <section className="output-history">
                    <div className="output-history-head"><div><strong>Últimos archivos</strong><span>Resultados guardados en este equipo</span></div><button onClick={() => clearRecentOutputs()}><Trash /> Limpiar</button></div>
                    <div className="output-history-list">
                      {recentOutputs.slice(0, 6).map((output) => <article key={`${output.path}-${output.createdAt}`}><div><strong title={output.path}>{outputName(output.path)}</strong><small>{output.label} · {outputTime(output.createdAt)}</small></div><span><button title={output.directory ? "Abrir carpeta" : "Abrir archivo"} onClick={() => void openPath(output.path)}><ArrowSquareOut /></button><button title="Mostrar ubicación" onClick={() => void revealPath(output.path)}><FolderOpen /></button></span></article>)}
                    </div>
                  </section>
                )}

                <div className="filter-row">
                  {categories.map((item) => <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => { setCategory(item); setSection("all"); }}>{item}</button>)}
                </div>

                <div className="tool-grid">
                  {filteredTools.map((tool) => {
                    const Icon = tool.icon;
                    const canOpen = tool.status === "available" && hasToolView(tool.id);
                    const isFavorite = favoriteIds.includes(tool.id);

                    return (
                      <article className={canOpen ? "tool-card" : "tool-card disabled"} key={tool.id}>
                        <button className={isFavorite ? "favorite-button active" : "favorite-button"} onClick={(event) => { event.stopPropagation(); toggleFavorite(tool.id); }} aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}>
                          <Star weight={isFavorite ? "fill" : "regular"} />
                        </button>
                        <button className="tool-card-main" onClick={() => canOpen && openTool(tool.id)} disabled={!canOpen}>
                          <span className="card-icon" style={{ color: tool.accent, backgroundColor: `${tool.accent}1c` }}><Icon weight="duotone" /></span>
                          <span className="card-copy"><strong>{tool.name}</strong><small>{tool.description}</small></span>
                          <span className={canOpen ? "status ready" : "status"}>{canOpen ? "Abrir" : "Próximamente"}</span>
                        </button>
                      </article>
                    );
                  })}
                </div>

                {!filteredTools.length && <div className="empty-state"><MagnifyingGlass /><strong>No encontramos esa herramienta</strong><span>Prueba con otra búsqueda, categoría o sección.</span></div>}
              </>
            )}
          </main>
        </div>

        {settingsOpen && (
          <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
            <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-heading">
                <div><p className="eyebrow">Apariencia</p><h2>Configuración</h2></div>
                <button onClick={() => setSettingsOpen(false)} aria-label="Cerrar"><X /></button>
              </div>
              <label htmlFor="opacity">Transparencia de la ventana</label>
              <div className="range-row"><span>Más transparente</span><output>{opacity}%</output></div>
              <input id="opacity" type="range" min="58" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} />
              <p className="settings-help">En la versión Tauri podrás ver el escritorio a través de la ventana. El texto mantiene un contraste mínimo para seguir siendo legible.</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

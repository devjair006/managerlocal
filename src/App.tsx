import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight as ModernArrowRight,
  ArrowSquareOut,
  Circuitry,
  Clock as ModernClock,
  Folder as ModernFolder,
  GearSix,
  MagnifyingGlass,
  QrCode as ModernQrCode,
  SpinnerGap,
  SquaresFour,
  Star as ModernStar,
  Toolbox,
  Trash as ModernTrash,
  Warning,
  X,
} from "@phosphor-icons/react";
import {
  ArrowRight,
  CircuitBoard,
  Clock,
  Close,
  ExternalLink,
  Folder,
  Grid2x3,
  Loading,
  Pixelarticons,
  ScanBarcode,
  Search,
  Settings2,
  Star,
  Trash,
  WarningDiamond,
} from "pixelarticons/react";
import { getDependencyCenterStatus, type DependencyStatus } from "./modules/dependency-center/dependency-center.service";
import { categories, tools } from "./modules/registry";
import { hasToolView, lazyToolViews } from "./modules/tool-routes";
import { WindowControls } from "./components/WindowControls";
import { ToolIcon } from "./components/ToolIcon";
import { accentOptions, MIN_WINDOW_OPACITY, useAppearance } from "./appearance";
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
  const isDesktopApp = "__TAURI_INTERNALS__" in window;
  const { preferences, setTheme, updatePreference, resetAppearance } = useAppearance();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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

  const BrandIcon = preferences.iconStyle === "modern" ? Toolbox : Pixelarticons;
  const ToolsIcon = preferences.iconStyle === "modern" ? SquaresFour : Grid2x3;
  const RecentIcon = preferences.iconStyle === "modern" ? ModernClock : Clock;
  const FavoriteIcon = preferences.iconStyle === "modern" ? ModernStar : Star;
  const SettingsIcon = preferences.iconStyle === "modern" ? GearSix : Settings2;
  const SearchIcon = preferences.iconStyle === "modern" ? MagnifyingGlass : Search;
  const LoadingIcon = preferences.iconStyle === "modern" ? SpinnerGap : Loading;
  const WarningIcon = preferences.iconStyle === "modern" ? Warning : WarningDiamond;
  const HealthIcon = preferences.iconStyle === "modern" ? Circuitry : CircuitBoard;
  const NextIcon = preferences.iconStyle === "modern" ? ModernArrowRight : ArrowRight;
  const ClearIcon = preferences.iconStyle === "modern" ? ModernTrash : Trash;
  const OpenIcon = preferences.iconStyle === "modern" ? ArrowSquareOut : ExternalLink;
  const FolderIcon = preferences.iconStyle === "modern" ? ModernFolder : Folder;
  const CloseIcon = preferences.iconStyle === "modern" ? X : Close;

  const pageTitle = section === "recent" ? "Recientes" : section === "favorites" ? "Favoritos" : "Todas las herramientas";
  const pageDescription = section === "recent"
    ? "Tus últimas herramientas usadas, listas para repetir tareas."
    : section === "favorites"
      ? "Accesos rápidos marcados por ti para trabajo diario."
      : "Utilidades rápidas, sin subir tus archivos a internet.";

  const safeWindowOpacity = Math.max(MIN_WINDOW_OPACITY, preferences.opacity);

  return (
    <div className="desktop-stage" style={{ "--panel-opacity": safeWindowOpacity / 100 } as React.CSSProperties}>
      <div className={isDesktopApp ? "app-window" : "app-window web-preview"}>
        <header className="titlebar" data-tauri-drag-region onMouseDown={(event) => void handleTitlebarMouseDown(event)}>
            <div className="brand" data-tauri-drag-region>
              <span className="brand-logo" data-tauri-drag-region><BrandIcon /></span>
              <strong data-tauri-drag-region>MANAGER LOCAL</strong>
            </div>
            <div className="titlebar-drag-area" data-tauri-drag-region><span className="local-badge" data-tauri-drag-region><i /> LOCAL / PRIVADO</span></div>
            {isDesktopApp ? <WindowControls /> : <div className="preview-window-controls" aria-hidden="true"><i /><i /><i /></div>}
        </header>

        <div className="app-body">
          <aside className="sidebar">
            <nav>
              <button className={!activeTool && section === "all" ? "nav-item active" : "nav-item"} onClick={() => { setSection("all"); setCategory("Todas"); setActiveTool(null); }}><ToolsIcon /> Herramientas</button>
              <button className={!activeTool && section === "recent" ? "nav-item active" : "nav-item"} onClick={() => { setSection("recent"); setCategory("Todas"); setActiveTool(null); }}><RecentIcon /> Recientes</button>
              <button className={!activeTool && section === "favorites" ? "nav-item active" : "nav-item"} onClick={() => { setSection("favorites"); setCategory("Todas"); setActiveTool(null); }}><FavoriteIcon /> Favoritos</button>
            </nav>

            <div className="sidebar-section">
              <p>Categorías</p>
              {categories.map((item) => (
                <button key={item} className={category === item ? "category active" : "category"} onClick={() => { setCategory(item); setSection("all"); setActiveTool(null); }}>{item}</button>
              ))}
            </div>

            <div className="sidebar-foot"><span>ML / 0.1</span><button className="nav-item settings-link" onClick={() => setSettingsOpen(true)}><SettingsIcon /> Configuración</button></div>
          </aside>

          <main className="content">
            {ActiveTool ? (
              <Suspense fallback={<div className="tool-loading"><LoadingIcon className="tool-loading-spinner" aria-hidden="true" /><p>Cargando herramienta...</p></div>}>
                <ActiveTool onBack={() => setActiveTool(null)} />
              </Suspense>
            ) : (
              <>
                <div className="content-header">
                  <div>
                    <p className="eyebrow">Biblioteca local / {filteredTools.length.toString().padStart(2, "0")}</p>
                    <h1>{pageTitle}</h1>
                    <p>{pageDescription}</p>
                  </div>
                  <div className="search">
                    <SearchIcon />
                    <input ref={searchInputRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar herramienta..." />
                    <kbd>Ctrl K</kbd>
                  </div>
                </div>

                <div className="dashboard-strip" aria-label="Resumen del espacio">
                  <span><i>01</i><strong>{availableToolsCount}</strong> módulos activos</span>
                  <span><i>02</i><strong>{favoriteIds.length}</strong> favoritos</span>
                  <span><i>03</i><strong>{recentIds.length}</strong> recientes</span>
                  <span><i>04</i><strong>{recentOutputs.length}</strong> salidas</span>
                </div>

                {section === "all" && !search && (
                  <section className={missingDependencies.length ? "health-card warning" : "health-card ready"}>
                    <div className="health-icon">{missingDependencies.length ? <WarningIcon /> : <HealthIcon />}</div>
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
                    <button className="secondary-button" onClick={() => openTool("dependency-center")}>Revisar sistema <NextIcon /></button>
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
                    <div className="output-history-head"><div><strong>Últimos archivos</strong><span>Resultados guardados en este equipo</span></div><button onClick={() => clearRecentOutputs()}><ClearIcon /> Limpiar</button></div>
                    <div className="output-history-list">
                      {recentOutputs.slice(0, 6).map((output) => <article key={`${output.path}-${output.createdAt}`}><div><strong title={output.path}>{outputName(output.path)}</strong><small>{output.label} · {outputTime(output.createdAt)}</small></div><span><button title={output.directory ? "Abrir carpeta" : "Abrir archivo"} onClick={() => void openPath(output.path)}><OpenIcon /></button><button title="Mostrar ubicación" onClick={() => void revealPath(output.path)}><FolderIcon /></button></span></article>)}
                    </div>
                  </section>
                )}

                <div className="filter-row">
                  {categories.map((item) => <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => { setCategory(item); setSection("all"); }}>{item}</button>)}
                </div>

                <div className="tool-grid">
                  {filteredTools.map((tool, index) => {
                    const canOpen = tool.status === "available" && hasToolView(tool.id);
                    const isFavorite = favoriteIds.includes(tool.id);

                    return (
                      <article className={canOpen ? "tool-card" : "tool-card disabled"} key={tool.id}>
                        <button className={isFavorite ? "favorite-button active" : "favorite-button"} onClick={(event) => { event.stopPropagation(); toggleFavorite(tool.id); }} aria-label={isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}>
                          <FavoriteIcon />
                        </button>
                        <button className="tool-card-main" onClick={() => canOpen && openTool(tool.id)} disabled={!canOpen}>
                          <span className="tool-number">{String(index + 1).padStart(2, "0")}</span>
                          <span className="card-icon"><ToolIcon toolId={tool.id} /></span>
                          <span className="card-copy"><small>{tool.category}</small><strong>{tool.name}</strong><span>{tool.description}</span></span>
                          <span className={canOpen ? "status ready" : "status"}>{canOpen ? <NextIcon /> : "Próximo"}</span>
                        </button>
                      </article>
                    );
                  })}
                </div>

                {!filteredTools.length && <div className="empty-state"><SearchIcon /><strong>No encontramos esa herramienta</strong><span>Prueba con otra búsqueda, categoría o sección.</span></div>}
              </>
            )}
          </main>
        </div>

        {settingsOpen && (
          <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}>
            <section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="modal-heading">
                <div><p className="eyebrow">Apariencia</p><h2>Configuración</h2></div>
                <button onClick={() => setSettingsOpen(false)} aria-label="Cerrar"><CloseIcon /></button>
              </div>

              <div className="appearance-section">
                <div className="appearance-label"><strong>Tema</strong><span>Cambia toda la superficie de la aplicación</span></div>
                <div className="theme-options" role="group" aria-label="Tema de la interfaz">
                  {([
                    ["dark", "Oscuro"],
                    ["light", "Claro"],
                    ["system", "Sistema"],
                  ] as const).map(([value, label]) => <button key={value} className={preferences.theme === value ? "active" : ""} aria-pressed={preferences.theme === value} onClick={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); setTheme(value, { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }); }}><i className={`theme-preview ${value}`} /><span>{label}</span></button>)}
                </div>
              </div>

              <div className="appearance-section">
                <div className="appearance-label"><strong>Estilo de iconos</strong><span>Puedes conservar el pixel o usar líneas suaves</span></div>
                <div className="icon-style-options" role="group" aria-label="Estilo de iconos">
                  <button className={preferences.iconStyle === "pixel" ? "active" : ""} onClick={() => updatePreference("iconStyle", "pixel")}><ScanBarcode /><span><strong>Pixel</strong><small>Identidad original</small></span></button>
                  <button className={preferences.iconStyle === "modern" ? "active" : ""} onClick={() => updatePreference("iconStyle", "modern")}><ModernQrCode /><span><strong>Moderno</strong><small>Líneas redondeadas</small></span></button>
                </div>
              </div>

              <div className="appearance-section">
                <div className="appearance-label"><strong>Color de acento</strong><span>Se aplica a selecciones, botones y estados</span></div>
                <div className="accent-options" role="group" aria-label="Color de acento">
                  {accentOptions.map((option) => <button key={option.value} className={preferences.accent === option.value ? "active" : ""} style={{ "--swatch": option.value } as React.CSSProperties} onClick={() => updatePreference("accent", option.value)} aria-label={option.label} title={option.label}><i /></button>)}
                </div>
              </div>

              <div className="appearance-section">
                <label htmlFor="opacity">Transparencia de la ventana</label>
                <div className="range-row"><span>Más transparente</span><output>{safeWindowOpacity}%</output></div>
                <input id="opacity" type="range" min={MIN_WINDOW_OPACITY} max="100" value={safeWindowOpacity} onChange={(event) => updatePreference("opacity", Number(event.target.value))} />
                <p className="settings-help">En Tauri podrás ver el escritorio a través de la ventana. En la versión web se conserva el fondo sólido.</p>
              </div>

              <button className="reset-appearance" onClick={resetAppearance}>Restablecer apariencia</button>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

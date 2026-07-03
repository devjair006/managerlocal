import { useMemo, useState } from "react";
import {
  ClockCounterClockwise,
  GearSix,
  MagnifyingGlass,
  SquaresFour,
  X,
} from "@phosphor-icons/react";
import logo from "./assets/logoManagerTools.png";
import { categories, tools } from "./modules/registry";
import { QrGenerator } from "./modules/qr-generator/QrGenerator";
import { WindowControls } from "./components/WindowControls";
import { BackgroundRemover } from "./modules/background-remover/BackgroundRemover";
import { ImageConverter } from "./modules/image-converter/ImageConverter";

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

export function App() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [opacity, setOpacity] = useState(100);

  const filteredTools = useMemo(() => tools.filter((tool) => {
    const matchesCategory = category === "Todas" || tool.category === category;
    const needle = search.toLocaleLowerCase();
    return matchesCategory && `${tool.name} ${tool.description}`.toLocaleLowerCase().includes(needle);
  }), [category, search]);

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
              <button className={!activeTool ? "nav-item active" : "nav-item"} onClick={() => setActiveTool(null)}><SquaresFour weight="fill" /> Herramientas</button>
              <button className="nav-item"><ClockCounterClockwise /> Recientes</button>
            </nav>
            <div className="sidebar-section"><p>Categorías</p>{categories.map((item) => <button key={item} className={category === item ? "category active" : "category"} onClick={() => { setCategory(item); setActiveTool(null); }}>{item}</button>)}</div>
            <button className="nav-item settings-link" onClick={() => setSettingsOpen(true)}><GearSix /> Configuración</button>
          </aside>

          <main className="content">
            {activeTool === "qr-generator" ? <QrGenerator onBack={() => setActiveTool(null)} /> : activeTool === "background-remover" ? <BackgroundRemover onBack={() => setActiveTool(null)} /> : activeTool === "image-converter" ? <ImageConverter onBack={() => setActiveTool(null)} /> : (
              <>
                <div className="content-header"><div><p className="eyebrow">Tu espacio privado</p><h1>Todas las herramientas</h1><p>Utilidades rápidas, sin subir tus archivos a internet.</p></div><div className="search"><MagnifyingGlass /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar herramienta..." /><kbd>Ctrl K</kbd></div></div>
                <div className="filter-row">{categories.map((item) => <button key={item} className={category === item ? "filter active" : "filter"} onClick={() => setCategory(item)}>{item}</button>)}</div>
                <div className="tool-grid">{filteredTools.map((tool) => { const Icon = tool.icon; return <button className="tool-card" key={tool.id} onClick={() => tool.status === "available" && setActiveTool(tool.id)} disabled={tool.status === "soon"}><span className="card-icon" style={{ color: tool.accent, backgroundColor: `${tool.accent}1c` }}><Icon weight="duotone" /></span><span className="card-copy"><strong>{tool.name}</strong><small>{tool.description}</small></span><span className={tool.status === "available" ? "status ready" : "status"}>{tool.status === "available" ? "Abrir" : "Próximamente"}</span></button>; })}</div>
                {!filteredTools.length && <div className="empty-state"><MagnifyingGlass /><strong>No encontramos esa herramienta</strong><span>Prueba con otra búsqueda o categoría.</span></div>}
              </>
            )}
          </main>
        </div>

        {settingsOpen && <div className="modal-backdrop" onMouseDown={() => setSettingsOpen(false)}><section className="settings-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><p className="eyebrow">Apariencia</p><h2>Configuración</h2></div><button onClick={() => setSettingsOpen(false)} aria-label="Cerrar"><X /></button></div><label htmlFor="opacity">Transparencia de la ventana</label><div className="range-row"><span>Más transparente</span><output>{opacity}%</output></div><input id="opacity" type="range" min="58" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /><p className="settings-help">En la versión Tauri podrás ver el escritorio a través de la ventana. El texto mantiene un contraste mínimo para seguir siendo legible.</p></section></div>}
      </div>
    </div>
  );
}

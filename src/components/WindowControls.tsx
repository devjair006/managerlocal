import { Minus, Square, X } from "@phosphor-icons/react";
import type { MouseEvent } from "react";

async function withCurrentWindow(action: "minimize" | "toggleMaximize" | "close") {
  if (!("__TAURI_INTERNALS__" in window)) return;

  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  await getCurrentWindow()[action]();
}

function runWindowAction(action: "minimize" | "toggleMaximize" | "close") {
  return (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void withCurrentWindow(action);
  };
}

export function WindowControls() {
  return (
    <div className="window-controls" aria-label="Controles de ventana">
      <button type="button" title="Minimizar" aria-label="Minimizar" onClick={runWindowAction("minimize")}>
        <Minus weight="bold" />
      </button>
      <button type="button" title="Maximizar o restaurar" aria-label="Maximizar o restaurar" onClick={runWindowAction("toggleMaximize")}>
        <Square weight="regular" />
      </button>
      <button type="button" className="window-close" title="Cerrar" aria-label="Cerrar aplicación" onClick={runWindowAction("close")}>
        <X weight="regular" />
      </button>
    </div>
  );
}

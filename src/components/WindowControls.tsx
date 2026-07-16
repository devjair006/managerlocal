import { Minus as ModernMinus, Square as ModernSquare, X as ModernClose } from "@phosphor-icons/react";
import { Close as PixelClose, Minus as PixelMinus, Square as PixelSquare } from "pixelarticons/react";
import type { MouseEvent } from "react";
import { useAppearance } from "../appearance";

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
  const { preferences } = useAppearance();
  const Minus = preferences.iconStyle === "modern" ? ModernMinus : PixelMinus;
  const Square = preferences.iconStyle === "modern" ? ModernSquare : PixelSquare;
  const Close = preferences.iconStyle === "modern" ? ModernClose : PixelClose;

  return (
    <div className="window-controls" aria-label="Controles de ventana">
      <button type="button" title="Minimizar" aria-label="Minimizar" onClick={runWindowAction("minimize")}>
        <Minus />
      </button>
      <button type="button" title="Maximizar o restaurar" aria-label="Maximizar o restaurar" onClick={runWindowAction("toggleMaximize")}>
        <Square />
      </button>
      <button type="button" className="window-close" title="Cerrar" aria-label="Cerrar aplicación" onClick={runWindowAction("close")}>
        <Close />
      </button>
    </div>
  );
}

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("Esta acción requiere la aplicación de escritorio");
  }
}

export async function openPath(path: string): Promise<void> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<void>("open_path", { path });
}

export async function revealPath(path: string): Promise<void> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<void>("reveal_path", { path });
}

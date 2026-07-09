function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("Guardar archivos requiere la aplicación de escritorio");
  }
}

export async function saveTextOutput(
  content: string,
  defaultPath: string,
  name: string,
  extensions: string[],
): Promise<string | null> {
  requireDesktop();
  const { save } = await import("@tauri-apps/plugin-dialog");
  const path = await save({ defaultPath, filters: [{ name, extensions }] });
  if (!path) return null;

  const { invoke } = await import("@tauri-apps/api/core");
  await invoke<void>("write_text_output", { path, content });
  return path;
}

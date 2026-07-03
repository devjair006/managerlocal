export type ImageResizerInput = {
  // TODO: define los campos de entrada
  sample: string;
};

export async function imageResizer(input: ImageResizerInput): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("image_resizer", { input });
  }

  // Fallback para desarrollo en navegador
  return Promise.resolve(input.sample);
}

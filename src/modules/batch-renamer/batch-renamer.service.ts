export type BatchRenamerInput = {
  // TODO: define los campos de entrada
  sample: string;
};

export async function batchRenamer(input: BatchRenamerInput): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("batch_renamer", { input });
  }

  // Fallback para desarrollo en navegador
  return Promise.resolve(input.sample);
}

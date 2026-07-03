export type BatchRenamerInput = { paths: string[]; prefix: string; suffix: string; find: string; replace: string; numbering: boolean; startNumber: number };
export type RenameResult = { from: string; to: string };

function requireDesktop() { if (!("__TAURI_INTERNALS__" in window)) throw new Error("El renombrado requiere la aplicación de escritorio"); }
export async function pickFilesToRename(): Promise<string[]> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ multiple: true, directory: false });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}
export async function batchRenamer(input: BatchRenamerInput): Promise<RenameResult[]> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<RenameResult[]>("batch_renamer", { input });
}

export type PdfOperation = "merge" | "extract" | "compress";

export type PdfToolsInput = {
  operation: PdfOperation;
  inputPaths: string[];
  outputPath: string;
  pages: number[];
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error("Esta herramienta requiere la aplicación de escritorio");
}

export async function pickPdfFiles(multiple: boolean): Promise<string[]> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ multiple, directory: false, filters: [{ name: "Documentos PDF", extensions: ["pdf"] }] });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

export async function pickPdfOutput(defaultName: string): Promise<string | null> {
  requireDesktop();
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({ defaultPath: defaultName, filters: [{ name: "Documento PDF", extensions: ["pdf"] }] });
}

export async function pdfTools(input: PdfToolsInput): Promise<string> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("pdf_tools", { input });
}

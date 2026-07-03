export type PdfToolsInput = {
  // TODO: define los campos de entrada
  sample: string;
};

export async function pdfTools(input: PdfToolsInput): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("pdf_tools", { input });
  }

  // Fallback para desarrollo en navegador
  return Promise.resolve(input.sample);
}

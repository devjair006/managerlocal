export type DocumentFormat = "markdown" | "html" | "text";
export type DocumentConvertInput = { source: DocumentFormat; target: DocumentFormat; content: string };

export async function convertDocument(input: DocumentConvertInput): Promise<string> {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error("Esta herramienta requiere la aplicación de escritorio");
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("convert_document", { input });
}

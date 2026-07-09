export type PdfOptimizationProfile = "screen" | "ebook" | "printer" | "prepress" | "default";

export type PdfOptimizerRuntime = {
  ghostscript: boolean;
  executable: string | null;
};

export type PdfOptimizationResult = {
  outputPath: string;
  originalBytes: number;
  optimizedBytes: number;
  savedBytes: number;
  savedPercent: number;
  profile: PdfOptimizationProfile;
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("El optimizador avanzado requiere la aplicación de escritorio");
  }
}

export async function getPdfOptimizerRuntime(): Promise<PdfOptimizerRuntime> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<PdfOptimizerRuntime>("pdf_optimizer_runtime");
}

export async function pickPdfInput(): Promise<string | null> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function pickPdfOutput(defaultName = "documento-optimizado-avanzado.pdf"): Promise<string | null> {
  requireDesktop();
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({
    defaultPath: defaultName,
    filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
  });
}

export async function optimizePdfAdvanced(inputPath: string, outputPath: string, profile: PdfOptimizationProfile): Promise<PdfOptimizationResult> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<PdfOptimizationResult>("optimize_pdf_advanced", {
    input: { inputPath, outputPath, profile },
  });
}

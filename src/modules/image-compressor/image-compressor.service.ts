export type CompressionResult = {
  fileName: string;
  outputPath: string;
  originalBytes: number;
  compressedBytes: number;
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) throw new Error("La compresión por lotes requiere la aplicación de escritorio");
}

export async function pickImagesToCompress(): Promise<string[]> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: true,
    directory: false,
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"] }],
  });
  if (!selected) return [];
  return Array.isArray(selected) ? selected : [selected];
}

export async function pickCompressionFolder(): Promise<string> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ multiple: false, directory: true });
  return typeof selected === "string" ? selected : "";
}

export async function compressImages(paths: string[], outputDirectory: string, quality: number): Promise<CompressionResult[]> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<CompressionResult[]>("image_compressor", { input: { paths, outputDirectory, quality } });
}

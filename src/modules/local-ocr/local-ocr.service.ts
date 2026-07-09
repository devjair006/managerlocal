export type OcrLanguage = "spa" | "eng" | "spa+eng";
export type OcrRuntime = { tesseract: boolean; pdftoppm: boolean };
function requireDesktop() { if (!("__TAURI_INTERNALS__" in window)) throw new Error("El OCR requiere la aplicación de escritorio"); }
export async function getOcrRuntime(): Promise<OcrRuntime> { requireDesktop(); const { invoke } = await import("@tauri-apps/api/core"); return invoke("ocr_runtime"); }
export async function pickOcrFile(): Promise<string | null> { requireDesktop(); const { open } = await import("@tauri-apps/plugin-dialog"); const selected = await open({ multiple: false, directory: false, filters: [{ name: "Imagen o PDF", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff", "pdf"] }] }); return typeof selected === "string" ? selected : null; }
export async function extractText(path: string, language: OcrLanguage): Promise<string> { requireDesktop(); const { invoke } = await import("@tauri-apps/api/core"); return invoke("extract_text_ocr", { input: { path, language } }); }

import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";

export type AiBackgroundModel = "default" | "u2net" | "u2net_human_seg" | "isnet-general-use" | "birefnet-general";

export type AiBackgroundProgressStage = "starting" | "downloadingModel" | "processing" | "saving" | "done";

export type AiBackgroundRuntime = {
  rembg: boolean;
  executable: string | null;
  modelsDirectory: string;
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("El recorte con IA local requiere la aplicación de escritorio");
  }
}

export async function getAiBackgroundRuntime(): Promise<AiBackgroundRuntime> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<AiBackgroundRuntime>("ai_background_runtime");
}

export async function pickAiBackgroundInput(): Promise<string | null> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Imágenes", extensions: ["png", "jpg", "jpeg", "webp", "bmp", "tif", "tiff"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function pickAiBackgroundOutput(defaultName = "imagen-sin-fondo-ia.png"): Promise<string | null> {
  requireDesktop();
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({ defaultPath: defaultName, filters: [{ name: "PNG transparente", extensions: ["png"] }] });
}

export async function removeBackgroundAi(input: {
  inputPath: string;
  outputPath: string;
  model: AiBackgroundModel;
  alphaMatting: boolean;
  optimizeSize: boolean;
}): Promise<string> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("remove_background_ai", { input });
}

export async function cancelRemoveBackgroundAi(): Promise<void> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke("cancel_remove_background_ai");
}

export async function imageSrc(path: string): Promise<string> {
  requireDesktop();
  const { convertFileSrc } = await import("@tauri-apps/api/core");
  return convertFileSrc(path);
}

export async function listenAiBackgroundProgress(
  onProgress: EventCallback<{ stage: AiBackgroundProgressStage }>,
): Promise<UnlistenFn> {
  requireDesktop();
  const { listen } = await import("@tauri-apps/api/event");
  return listen("rembg-progress", onProgress);
}

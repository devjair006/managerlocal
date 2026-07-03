export type MediaFormat = "mp4" | "webm" | "mp3" | "wav" | "m4a" | "gif";
export type VideoConverterInput = { inputPath: string; outputPath: string; format: MediaFormat };

function requireDesktop() { if (!("__TAURI_INTERNALS__" in window)) throw new Error("La conversión multimedia requiere la aplicación de escritorio"); }

export async function pickMediaFile(): Promise<string | null> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ multiple: false, directory: false, filters: [{ name: "Audio y video", extensions: ["mp4", "webm", "mov", "mkv", "avi", "mp3", "wav", "m4a", "ogg", "flac"] }] });
  return typeof selected === "string" ? selected : null;
}

export async function pickMediaOutput(format: MediaFormat): Promise<string | null> {
  requireDesktop();
  const { save } = await import("@tauri-apps/plugin-dialog");
  return save({ defaultPath: `convertido.${format}`, filters: [{ name: format.toUpperCase(), extensions: [format] }] });
}

export async function videoConverter(input: VideoConverterInput): Promise<string> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("video_converter", { input });
}

export async function ffmpegAvailable(): Promise<boolean> {
  if (!("__TAURI_INTERNALS__" in window)) return false;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<boolean>("ffmpeg_available");
}

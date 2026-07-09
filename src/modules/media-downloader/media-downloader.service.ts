export type MediaDownloadMode = "best" | "mp4" | "mp3";

export type MediaDownloaderRuntime = {
  ytDlp: boolean;
  ffmpeg: boolean;
};

export type MediaDownloadResult = {
  outputDirectory: string;
  mode: MediaDownloadMode;
  message: string;
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("La descarga de medios requiere la aplicación de escritorio");
  }
}

export async function getMediaDownloaderRuntime(): Promise<MediaDownloaderRuntime> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<MediaDownloaderRuntime>("media_downloader_runtime");
}

export async function pickDownloadDirectory(): Promise<string | null> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({ multiple: false, directory: true });
  return typeof selected === "string" ? selected : null;
}

export async function downloadPermittedMedia(input: {
  url: string;
  outputDirectory: string;
  mode: MediaDownloadMode;
  confirmPermitted: boolean;
}): Promise<MediaDownloadResult> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<MediaDownloadResult>("download_permitted_media", { input });
}

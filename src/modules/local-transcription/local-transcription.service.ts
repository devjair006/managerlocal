export type WhisperModelInfo = {
  name: string;
  path: string;
  sizeBytes: number;
};

export type TranscriptionRuntime = {
  whisper: boolean;
  executable: string | null;
  bundledModels: WhisperModelInfo[];
  modelsDirectory: string | null;
};

export type TranscriptionInput = {
  audioPath: string;
  modelPath: string;
  language: string;
  translate: boolean;
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("La transcripción local requiere la aplicación de escritorio");
  }
}

export async function getTranscriptionRuntime(): Promise<TranscriptionRuntime> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<TranscriptionRuntime>("transcription_runtime");
}

export async function pickAudioFile(): Promise<string | null> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Audio o video", extensions: ["wav", "mp3", "m4a", "aac", "flac", "ogg", "mp4", "mov", "mkv", "webm"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function pickWhisperModel(): Promise<string | null> {
  requireDesktop();
  const { open } = await import("@tauri-apps/plugin-dialog");
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Modelo Whisper", extensions: ["bin"] }],
  });
  return typeof selected === "string" ? selected : null;
}

export async function transcribeLocal(input: TranscriptionInput): Promise<string> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string>("transcribe_local_audio", { input });
}

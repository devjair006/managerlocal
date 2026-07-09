export type ResourceFile = {
  name: string;
  path: string;
  sizeBytes: number;
};

export type ResourceManagerStatus = {
  binariesDirectory: string;
  userBinariesDirectory: string;
  modelsDirectory: string;
  tessdataDirectory: string | null;
  modelFiles: ResourceFile[];
  sidecarFiles: ResourceFile[];
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("El gestor de recursos requiere la aplicación de escritorio");
  }
}

export async function getResourceManagerStatus(): Promise<ResourceManagerStatus> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<ResourceManagerStatus>("resource_manager_status");
}

export async function openResourceFolder(kind: "binaries" | "models" | "tessdata"): Promise<void> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<void>("open_resource_folder", { kind });
}

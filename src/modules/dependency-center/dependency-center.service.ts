export type DependencyStatus = {
  id: string;
  name: string;
  available: boolean;
  executable: string | null;
  version: string | null;
  usedBy: string[];
  installHint: string;
  packagingHint: string;
  requiredFor: string;
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("El centro de dependencias requiere la aplicación de escritorio");
  }
}

export async function getDependencyCenterStatus(): Promise<DependencyStatus[]> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<DependencyStatus[]>("dependency_center_status");
}

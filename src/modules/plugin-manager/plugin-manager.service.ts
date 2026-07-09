export type PluginSystemStatus = {
  pluginsDirectory: string;
  trustedPublishers: number;
  policy: string;
};

export type PluginPermission = {
  id: string;
  reason: string;
};

export type PluginAudit = {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  directory: string;
  entry: string;
  permissions: PluginPermission[];
  signatureStatus: "trusted" | "unsigned" | "untrusted" | "invalid";
  trusted: boolean;
  runnable: boolean;
  issues: string[];
};

function requireDesktop() {
  if (!("__TAURI_INTERNALS__" in window)) {
    throw new Error("El sistema de plugins requiere la aplicación de escritorio");
  }
}

export async function getPluginSystemStatus(): Promise<PluginSystemStatus> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<PluginSystemStatus>("plugin_system_status");
}

export async function scanLocalPlugins(): Promise<PluginAudit[]> {
  requireDesktop();
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<PluginAudit[]>("scan_local_plugins");
}

import QRCode from "qrcode";

type GenerateQrInput = {
  content: string;
  size: number;
};

export async function generateQr(input: GenerateQrInput): Promise<string> {
  // En la app de escritorio usamos Rust. En el navegador mantenemos este
  // adaptador para desarrollar la interfaz sin compilar Tauri en cada cambio.
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("generate_qr", { input });
  }

  return QRCode.toDataURL(input.content, {
    width: input.size,
    margin: 2,
    color: { dark: "#15111d", light: "#ffffff" },
  });
}

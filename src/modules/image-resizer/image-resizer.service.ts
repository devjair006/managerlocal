export type ImageResizerInput = {
  imageData: string;
  width: number;
  height: number;
};

async function resizeInBrowser(input: ImageResizerInput): Promise<string> {
  const image = new Image();
  image.src = input.imageData;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = input.width;
  canvas.height = input.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar el lienzo");

  context.drawImage(image, 0, 0, input.width, input.height);
  return canvas.toDataURL("image/png");
}

export async function imageResizer(input: ImageResizerInput): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("image_resizer", { input });
  }

  return resizeInBrowser(input);
}

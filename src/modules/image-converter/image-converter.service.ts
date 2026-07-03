export type ImageFormat = "png" | "jpg" | "webp";

export type ImageConverterInput = {
  imageData: string;
  format: ImageFormat;
  quality: number;
};

async function convertInBrowser(input: ImageConverterInput): Promise<string> {
  const image = new Image();
  image.src = input.imageData;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No se pudo preparar el conversor");

  if (input.format === "jpg") {
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.drawImage(image, 0, 0);

  const mime = input.format === "jpg" ? "image/jpeg" : `image/${input.format}`;
  return canvas.toDataURL(mime, input.quality / 100);
}

export async function imageConverter(input: ImageConverterInput): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("image_converter", { input });
  }
  return convertInBrowser(input);
}

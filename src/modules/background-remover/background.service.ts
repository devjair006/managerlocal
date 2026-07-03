export type RemoveWhiteBackgroundInput = {
  imageData: string;
  tolerance: number;
};

async function removeInBrowser(input: RemoveWhiteBackgroundInput): Promise<string> {
  const image = new Image();
  image.src = input.imageData;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("No se pudo preparar el procesador de imagen");

  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  const threshold = 255 - input.tolerance;

  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    if (red >= threshold && green >= threshold && blue >= threshold) {
      pixels.data[index + 3] = 0;
    }
  }

  context.putImageData(pixels, 0, 0);
  return canvas.toDataURL("image/png");
}

export async function removeWhiteBackground(input: RemoveWhiteBackgroundInput): Promise<string> {
  if ("__TAURI_INTERNALS__" in window) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke<string>("remove_white_background", { input });
  }

  return removeInBrowser(input);
}

import type { ComponentType } from "react";
import { QrGenerator } from "./qr-generator/QrGenerator";
import { BackgroundRemover } from "./background-remover/BackgroundRemover";
import { ImageConverter } from "./image-converter/ImageConverter";
import { ImageResizer } from "./image-resizer/ImageResizer";
import { PdfTools } from "./pdf-tools/PdfTools";
import { VideoConverter } from "./video-converter/VideoConverter";
import { BatchRenamer } from "./batch-renamer/BatchRenamer";

export type ToolViewProps = { onBack: () => void };

export const toolViews: Record<string, ComponentType<ToolViewProps>> = {
  "qr-generator": QrGenerator,
  "background-remover": BackgroundRemover,
  "image-converter": ImageConverter,
  "image-resizer": ImageResizer,
  "pdf-tools": PdfTools,
  "video-converter": VideoConverter,
  "batch-renamer": BatchRenamer,
};

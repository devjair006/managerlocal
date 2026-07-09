import type { ComponentType } from "react";
import { QrGenerator } from "./qr-generator/QrGenerator";
import { BackgroundRemover } from "./background-remover/BackgroundRemover";
import { ImageConverter } from "./image-converter/ImageConverter";
import { ImageResizer } from "./image-resizer/ImageResizer";
import { PdfTools } from "./pdf-tools/PdfTools";
import { VideoConverter } from "./video-converter/VideoConverter";
import { BatchRenamer } from "./batch-renamer/BatchRenamer";
import { ImageCompressor } from "./image-compressor/ImageCompressor";
import { TextDiff } from "./text-diff/TextDiff";
import { DocumentConverter } from "./document-converter/DocumentConverter";
import { UnitConverter } from "./unit-converter/UnitConverter";
import { LocalOcr } from "./local-ocr/LocalOcr";
import { AdvancedPdfOptimizer } from "./advanced-pdf-optimizer/AdvancedPdfOptimizer";
import { LocalTranscription } from "./local-transcription/LocalTranscription";
import { PluginManager } from "./plugin-manager/PluginManager";
import { MediaDownloader } from "./media-downloader/MediaDownloader";
import { AiBackgroundRemover } from "./ai-background-remover/AiBackgroundRemover";
import { DependencyCenter } from "./dependency-center/DependencyCenter";

export type ToolViewProps = { onBack: () => void };

export const toolViews: Record<string, ComponentType<ToolViewProps>> = {
  "qr-generator": QrGenerator,
  "background-remover": BackgroundRemover,
  "ai-background-remover": AiBackgroundRemover,
  "image-converter": ImageConverter,
  "image-resizer": ImageResizer,
  "pdf-tools": PdfTools,
  "advanced-pdf-optimizer": AdvancedPdfOptimizer,
  "video-converter": VideoConverter,
  "media-downloader": MediaDownloader,
  "local-transcription": LocalTranscription,
  "batch-renamer": BatchRenamer,
  "image-compressor": ImageCompressor,
  "text-diff": TextDiff,
  "document-converter": DocumentConverter,
  "unit-converter": UnitConverter,
  "local-ocr": LocalOcr,
  "plugin-manager": PluginManager,
  "dependency-center": DependencyCenter,
};

import { lazy, type ComponentType, type LazyExoticComponent } from "react";

export type ToolViewProps = { onBack: () => void };

const loaders = {
  "password-generator": () => import("./password-generator/PasswordGenerator").then((module) => ({ default: module.PasswordGenerator })),
  "qr-generator": () => import("./qr-generator/QrGenerator").then((module) => ({ default: module.QrGenerator })),
  "background-remover": () => import("./background-remover/BackgroundRemover").then((module) => ({ default: module.BackgroundRemover })),
  "ai-background-remover": () => import("./ai-background-remover/AiBackgroundRemover").then((module) => ({ default: module.AiBackgroundRemover })),
  "image-converter": () => import("./image-converter/ImageConverter").then((module) => ({ default: module.ImageConverter })),
  "image-resizer": () => import("./image-resizer/ImageResizer").then((module) => ({ default: module.ImageResizer })),
  "pdf-tools": () => import("./pdf-tools/PdfTools").then((module) => ({ default: module.PdfTools })),
  "advanced-pdf-optimizer": () => import("./advanced-pdf-optimizer/AdvancedPdfOptimizer").then((module) => ({ default: module.AdvancedPdfOptimizer })),
  "video-converter": () => import("./video-converter/VideoConverter").then((module) => ({ default: module.VideoConverter })),
  "media-downloader": () => import("./media-downloader/MediaDownloader").then((module) => ({ default: module.MediaDownloader })),
  "local-transcription": () => import("./local-transcription/LocalTranscription").then((module) => ({ default: module.LocalTranscription })),
  "batch-renamer": () => import("./batch-renamer/BatchRenamer").then((module) => ({ default: module.BatchRenamer })),
  "image-compressor": () => import("./image-compressor/ImageCompressor").then((module) => ({ default: module.ImageCompressor })),
  "text-diff": () => import("./text-diff/TextDiff").then((module) => ({ default: module.TextDiff })),
  "document-converter": () => import("./document-converter/DocumentConverter").then((module) => ({ default: module.DocumentConverter })),
  "unit-converter": () => import("./unit-converter/UnitConverter").then((module) => ({ default: module.UnitConverter })),
  "local-ocr": () => import("./local-ocr/LocalOcr").then((module) => ({ default: module.LocalOcr })),
  "plugin-manager": () => import("./plugin-manager/PluginManager").then((module) => ({ default: module.PluginManager })),
  "dependency-center": () => import("./dependency-center/DependencyCenter").then((module) => ({ default: module.DependencyCenter })),
} satisfies Record<string, () => Promise<{ default: ComponentType<ToolViewProps> }>>;

export type ToolId = keyof typeof loaders;

type ToolViewComponent = ComponentType<ToolViewProps>;

export const lazyToolViews = Object.fromEntries(
  (Object.keys(loaders) as ToolId[]).map((id) => [id, lazy(loaders[id])]),
) as Record<ToolId, LazyExoticComponent<ToolViewComponent>>;

export function hasToolView(id: string): id is ToolId {
  return id in loaders;
}

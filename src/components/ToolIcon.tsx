import {
  Archive,
  ArrowsClockwise,
  Calculator,
  Code,
  Cpu,
  DownloadSimple,
  FilePdf,
  FileText,
  Image,
  Images,
  MagicWand,
  Password,
  PuzzlePiece,
  QrCode,
  Resize,
  Scan,
  Sparkle,
  VideoCamera,
  Waveform,
  type Icon,
} from "@phosphor-icons/react";
import { useAppearance } from "../appearance";
import { tools } from "../modules/registry";

const modernToolIcons: Record<string, Icon> = {
  "password-generator": Password,
  "qr-generator": QrCode,
  "background-remover": MagicWand,
  "ai-background-remover": Sparkle,
  "image-converter": Image,
  "image-compressor": Images,
  "image-resizer": Resize,
  "pdf-tools": FilePdf,
  "advanced-pdf-optimizer": Archive,
  "video-converter": VideoCamera,
  "media-downloader": DownloadSimple,
  "local-transcription": Waveform,
  "local-ocr": Scan,
  "document-converter": Code,
  "text-diff": FileText,
  "unit-converter": Calculator,
  "batch-renamer": ArrowsClockwise,
  "plugin-manager": PuzzlePiece,
  "dependency-center": Cpu,
};

interface ToolIconProps {
  toolId: string;
  className?: string;
}

export function ToolIcon({ toolId, className = "" }: ToolIconProps) {
  const { preferences } = useAppearance();
  const tool = tools.find((item) => item.id === toolId);
  if (!tool) return null;

  const IconComponent = preferences.iconStyle === "modern" ? modernToolIcons[toolId] ?? tool.icon : tool.icon;
  return <IconComponent className={className} aria-hidden="true" />;
}

import {
  ArrowsClockwise,
  FilePdf,
  ImageSquare,
  MagicWand,
  QrCode,
  Resize,
  VideoCamera,
} from "@phosphor-icons/react";
import type { ToolDefinition } from "../types/tool";

export const tools: ToolDefinition[] = [
  {
    id: "qr-generator",
    name: "Generador QR",
    description: "Convierte enlaces o texto en un código QR listo para guardar.",
    category: "Productividad",
    icon: QrCode,
    accent: "#a78bfa",
    status: "available",
  },
  {
    id: "background-remover",
    name: "Quitar fondo blanco",
    description: "Convierte fondos blancos en transparencia y exporta PNG.",
    category: "Imágenes",
    icon: MagicWand,
    accent: "#fb7185",
    status: "available",
  },
  {
    id: "image-converter",
    name: "Convertir imágenes",
    description: "Convierte PNG, JPG y WebP de forma local y por lotes.",
    category: "Imágenes",
    icon: ImageSquare,
    accent: "#38bdf8",
    status: "available",
  },
  {
    id: "image-resizer",
    name: "Redimensionar",
    description: "Cambia medidas y peso conservando la mejor calidad posible.",
    category: "Imágenes",
    icon: Resize,
    accent: "#34d399",
    status: "available",
  },
  {
    id: "pdf-tools",
    name: "Herramientas PDF",
    description: "Une, divide, ordena y comprime documentos PDF.",
    category: "PDF",
    icon: FilePdf,
    accent: "#f87171",
    status: "soon",
  },
  {
    id: "video-converter",
    name: "Convertir video",
    description: "Convierte formatos de audio y video usando FFmpeg.",
    category: "Multimedia",
    icon: VideoCamera,
    accent: "#fbbf24",
    status: "soon",
  },
  {
    id: "batch-renamer",
    name: "Renombrar archivos",
    description: "Renombra grupos de archivos con reglas reutilizables.",
    category: "Productividad",
    icon: ArrowsClockwise,
    accent: "#22d3ee",
    status: "soon",
  },
];

export const categories = ["Todas", "Imágenes", "PDF", "Productividad", "Multimedia"] as const;

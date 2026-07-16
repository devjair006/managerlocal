import type { ComponentType, SVGProps } from "react";

export type ToolCategory = "Imágenes" | "PDF" | "Productividad" | "Multimedia";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;
  status: "available" | "soon";
}

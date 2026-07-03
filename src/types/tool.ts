import type { Icon } from "@phosphor-icons/react";

export type ToolCategory = "Imágenes" | "PDF" | "Productividad" | "Multimedia";

export interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  category: ToolCategory;
  icon: Icon;
  accent: string;
  status: "available" | "soon";
}

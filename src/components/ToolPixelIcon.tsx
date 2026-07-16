import { ToolIcon } from "./ToolIcon";

interface ToolPixelIconProps {
  toolId: string;
  className?: string;
}

export function ToolPixelIcon({ toolId, className = "" }: ToolPixelIconProps) {
  return <span className={`tool-heading-icon ${className}`.trim()}><ToolIcon toolId={toolId} /></span>;
}

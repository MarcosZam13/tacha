import type { LucideIcon } from "lucide-react";
import type { IconSizeType } from "@/constants";

export interface IconProps {
  /** El componente de lucide-react, sin instanciar: `icon={Trash2}`. */
  icon: LucideIcon;
  size?: IconSizeType;
}

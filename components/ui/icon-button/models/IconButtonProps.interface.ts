import type { LucideIcon } from "lucide-react";
import type { IconButtonToneType } from "@/constants";

export interface IconButtonProps {
  icon: LucideIcon;
  /** Nombre accesible del botón. Los tests lo buscan por este texto, así que no cambia con el ícono. */
  label: string;
  tone?: IconButtonToneType;
  isDisabled?: boolean;
  onClick: () => void;
}

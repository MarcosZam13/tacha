import type { ButtonVariantType } from "@/constants";

export interface ButtonProps {
  /** Id del elemento que el botón muestra u oculta (aria-controls). */
  ariaControls?: string;
  /** Solo para botones que abren y cierran algo: dice al lector de pantalla si está abierto. */
  ariaExpanded?: boolean;
  children: React.ReactNode;
  variant?: ButtonVariantType;
  isDisabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

import type { ButtonVariantType } from "@/constants";

export interface ButtonProps {
  children: React.ReactNode;
  variant?: ButtonVariantType;
  isDisabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

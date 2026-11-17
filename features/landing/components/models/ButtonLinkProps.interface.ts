import type { BUTTON_VARIANT, ButtonVariantType } from "@/constants";

/** Las variantes que tienen estilo de enlace: destructiva no aplica a una navegación. */
export type ButtonLinkVariantType = Exclude<ButtonVariantType, typeof BUTTON_VARIANT.DESTRUCTIVE>;

export interface ButtonLinkProps {
  children: React.ReactNode;
  href: string;
  variant?: ButtonLinkVariantType;
}

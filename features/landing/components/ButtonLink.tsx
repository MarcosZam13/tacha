import Link from "next/link";
import { BUTTON_VARIANT } from "@/constants";
import type { ButtonLinkProps, ButtonLinkVariantType } from "./models/ButtonLinkProps.interface";

// Los mismos colores que las variantes de Button (components/ui/button).
const VARIANT_CLASS_NAME: Record<ButtonLinkVariantType, string> = {
  [BUTTON_VARIANT.PRIMARY]: "bg-tacha-teal text-white hover:opacity-90",
  [BUTTON_VARIANT.SECONDARY]: "border border-tacha-teal text-tacha-teal hover:bg-tacha-teal/10",
};

export const ButtonLink = ({
  children,
  href,
  variant = BUTTON_VARIANT.PRIMARY,
}: ButtonLinkProps): React.JSX.Element => (
  <Link
    href={href}
    className={`inline-block rounded-tacha-badge px-4 py-2 text-center font-body text-sm font-semibold transition-opacity ${VARIANT_CLASS_NAME[variant]}`}
  >
    {children}
  </Link>
);

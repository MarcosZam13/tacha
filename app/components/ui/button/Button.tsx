import { BUTTON_VARIANT } from "@/app/constants";
import type { ButtonProps } from "./models/ButtonProps.interface";

const VARIANT_CLASS_NAME: Record<string, string> = {
  [BUTTON_VARIANT.PRIMARY]: "bg-tacha-teal text-white hover:opacity-90",
  [BUTTON_VARIANT.SECONDARY]:
    "border border-tacha-teal text-tacha-teal hover:bg-tacha-teal/10",
  [BUTTON_VARIANT.DESTRUCTIVE]: "bg-red-600 text-white hover:opacity-90",
};

export const Button = ({
  children,
  variant = BUTTON_VARIANT.PRIMARY,
  isDisabled = false,
  type = "button",
  onClick,
}: ButtonProps): React.JSX.Element => (
  <button
    type={type}
    disabled={isDisabled}
    onClick={onClick}
    className={`rounded-tacha-badge px-4 py-2 font-body text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_CLASS_NAME[variant]}`}
  >
    {children}
  </button>
);

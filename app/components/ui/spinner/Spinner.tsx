import { SPINNER_SIZE } from "@/app/constants";
import type { SpinnerProps } from "./models/SpinnerProps.interface";

const SIZE_CLASS_NAME: Record<string, string> = {
  [SPINNER_SIZE.SMALL]: "h-4 w-4 border-2",
  [SPINNER_SIZE.MEDIUM]: "h-6 w-6 border-2",
  [SPINNER_SIZE.LARGE]: "h-10 w-10 border-[3px]",
};

export const Spinner = ({
  size = SPINNER_SIZE.MEDIUM,
  label = "Cargando",
}: SpinnerProps): React.JSX.Element => (
  <span
    role="status"
    aria-label={label}
    className={`inline-block animate-spin rounded-full border-tacha-border border-t-tacha-teal ${SIZE_CLASS_NAME[size]}`}
  />
);

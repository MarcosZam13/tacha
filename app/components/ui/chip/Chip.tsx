import { CHIP_TONE } from "@/app/constants";
import type { ChipProps } from "./models/ChipProps.interface";

const TONE_CLASS_NAME: Record<string, string> = {
  [CHIP_TONE.NEUTRAL]: "bg-tacha-chipbg border-tacha-chipborder text-tacha-text",
  [CHIP_TONE.TEAL]: "bg-tacha-teal/10 border-tacha-teal text-tacha-teal",
  [CHIP_TONE.TERRACOTTA]: "bg-tacha-terracotta/10 border-tacha-terracotta text-tacha-terracotta",
};

/** Estado/tamaño/categoría — pill shape (DESIGN.md §5, radio ~8-20px). */
export const Chip = ({ children, tone = CHIP_TONE.NEUTRAL }: ChipProps): React.JSX.Element => (
  <span
    className={`inline-flex items-center rounded-tacha-chip border px-3 py-1 font-body text-xs font-medium ${TONE_CLASS_NAME[tone]}`}
  >
    {children}
  </span>
);

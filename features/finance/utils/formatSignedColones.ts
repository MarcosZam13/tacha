import { AMOUNT_SIGN } from "../constants/finance.constants";
import { formatColones } from "./formatColones";

/**
 * El monto de un ajuste con su signo (SPEC §8): 5000 → "+₡5 000", -5000 →
 * "−₡5 000". El signo va en texto, no solo con color (§9). Se redondea como
 * cualquier monto; uno que se ve como ₡0 va sin signo.
 */
export const formatSignedColones = (amount: number): string => {
  const rounded = Math.round(amount);
  if (rounded === 0) return formatColones(0);
  return `${rounded > 0 ? AMOUNT_SIGN.PLUS : AMOUNT_SIGN.MINUS}${formatColones(Math.abs(rounded))}`;
};

import { SPENDING_PERIOD } from "../constants/finance.constants";
import type { SpendingPeriodType } from "../constants/finance.constants";

const SPENDING_PERIODS: readonly string[] = Object.values(SPENDING_PERIOD);

/**
 * Un nivel de periodo llega como text de la base. Los checks de la 027 y la 040
 * garantizan uno de los tres, pero un valor fuera del contrato es un error, no
 * se ignora: quien llama lanza.
 */
export const isSpendingPeriod = (period: string): period is SpendingPeriodType => SPENDING_PERIODS.includes(period);

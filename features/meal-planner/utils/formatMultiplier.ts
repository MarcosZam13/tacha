import { MULTIPLIER_FORMAT } from "../constants/meal-planner.constants";
import { toDecimalCommaText } from "./toDecimalCommaText";

/** 2 → "×2"; 0.5 → "×0,5". */
export const formatMultiplier = (multiplier: number): string => `${MULTIPLIER_FORMAT.PREFIX}${toDecimalCommaText(multiplier)}`;

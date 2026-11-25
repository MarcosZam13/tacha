import { MEAL_PLAN_DB } from "../constants/meal-planner.constants";

/** El error de la base (062) que dice que quien llama ya no tiene familia. */
export const isNoHouseholdError = (error: unknown): boolean =>
  typeof error === "object" && error !== null && "hint" in error && error.hint === MEAL_PLAN_DB.HINT.NO_HOUSEHOLD;

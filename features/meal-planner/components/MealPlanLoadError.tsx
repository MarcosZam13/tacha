import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import type { MealPlanLoadErrorProps } from "./models/MealPlanLoadErrorProps.interface";

/**
 * Falló la carga del plan. No se dice "no hay nada planeado": no se sabe. Los
 * espacios quedan deshabilitados hasta que "Reintentar" lo lea. role="alert":
 * aparece sin que cambie la página, así que el lector de pantalla lo anuncia.
 */
export const MealPlanLoadError = ({ onRetry }: MealPlanLoadErrorProps): React.JSX.Element => (
  <div role="alert" className="flex flex-col items-start gap-2 font-body text-sm text-red-600">
    <p>{MEAL_SLOT_TEXT.PLAN_LOAD_ERROR}</p>
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
      {MEAL_SLOT_TEXT.RETRY}
    </Button>
  </div>
);

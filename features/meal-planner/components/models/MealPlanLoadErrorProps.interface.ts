import type { WeekMealPlanViewModel } from "../../models/meal-plan.interfaces";

export interface MealPlanLoadErrorProps {
  /** Misma firma que el ViewModel del plan: si cambia allá, el mensaje se entera al compilar. */
  onRetry: WeekMealPlanViewModel["onPlanRetry"];
}

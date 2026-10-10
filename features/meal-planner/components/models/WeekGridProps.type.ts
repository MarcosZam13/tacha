import type { MealPlannerViewModel } from "../../models/meal-planner.interfaces";

/**
 * Los días, y lo que cada espacio necesita para dibujarse y abrir el diálogo.
 * Las firmas salen del ViewModel: si cambian allá, la grilla se entera al compilar.
 */
export type WeekGridProps = Pick<MealPlannerViewModel, "days"> & {
  getEntry: MealPlannerViewModel["plan"]["getEntry"];
  isDisabled: boolean;
  onSlotOpen: MealPlannerViewModel["dialog"]["onSlotOpen"];
};

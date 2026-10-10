import type { MealPlannerViewModel } from "../../models/meal-planner.interfaces";

/** Subconjunto del ViewModel: la grilla solo necesita los días. */
export type WeekGridProps = Pick<MealPlannerViewModel, "days">;

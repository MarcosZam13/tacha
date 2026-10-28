import type { MealPlannerViewModel } from "../../models/meal-planner.interfaces";

/** Subconjunto del ViewModel: el selector no necesita los días ni si la pantalla está lista. */
export type WeekSelectorProps = Pick<
  MealPlannerViewModel,
  "canGoToNextWeek" | "canGoToPreviousWeek" | "onNextWeek" | "onPreviousWeek" | "rangeLabel" | "weekLabel"
>;

import type { MealPlannerViewModel, WeekDay } from "../../models/meal-planner.interfaces";

export interface MealPlannerDayProps {
  day: WeekDay;
  getEntry: MealPlannerViewModel["plan"]["getEntry"];
  isDisabled: boolean;
  onSlotOpen: MealPlannerViewModel["dialog"]["onSlotOpen"];
}

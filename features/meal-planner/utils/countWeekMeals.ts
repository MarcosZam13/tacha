import type { NullableRef } from "@/types/nullable.types";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { WeekDay } from "../models/meal-planner.interfaces";
import type { MealTypeType } from "../models/meal-planner.types";

/** Cuántos espacios de la semana a la vista tienen una comida asignada. */
export const countWeekMeals = (
  days: WeekDay[],
  getEntry: (dateKey: string, mealType: MealTypeType) => NullableRef<MealPlanEntry>,
): number =>
  days.reduce(
    (total, day) => total + day.slots.filter((slot) => getEntry(day.dateKey, slot.mealType) !== null).length,
    0,
  );

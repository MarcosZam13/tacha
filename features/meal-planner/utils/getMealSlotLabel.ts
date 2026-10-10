import type { NullableRef } from "@/types/nullable.types";
import { MEAL_SLOT_TEXT, MEAL_TYPE_LABEL } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { MealTypeType } from "../models/meal-planner.types";

/** "Almuerzo del lunes 12": el nombre del espacio, para el título del diálogo y el nombre accesible. */
export const getMealSlotName = (mealType: MealTypeType, dayLongLabel: string): string =>
  `${MEAL_TYPE_LABEL[mealType]}${MEAL_SLOT_TEXT.OF_DAY}${dayLongLabel.toLowerCase()}`;

/**
 * El nombre accesible del botón de un espacio: dice día, comida, qué tiene y qué
 * pasa al tocarlo. "Almuerzo del lunes 12, vacío, asignar" /
 * "Almuerzo del lunes 12: Arroz con leche, cambiar".
 */
export const getMealSlotLabel = (
  mealType: MealTypeType,
  dayLongLabel: string,
  entry: NullableRef<MealPlanEntry>,
): string => {
  const slotName = getMealSlotName(mealType, dayLongLabel);

  return entry
    ? `${slotName}${MEAL_SLOT_TEXT.ASSIGNED_SEPARATOR}${entry.recipeName}${MEAL_SLOT_TEXT.ASSIGNED_ACTION}`
    : `${slotName}${MEAL_SLOT_TEXT.EMPTY_ACTION}`;
};

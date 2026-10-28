import { COOK_CHOICE, MEAL_TYPE } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";
import type { WeekDay } from "../models/meal-planner.interfaces";

/** Una entrada del plan con cocinero "Yo" y ×1: lo justo para armar listas en los tests. */
export const createEntry = (
  id: string,
  dateKey: string,
  mealType: MealPlanEntry["mealType"],
  recipeName: string,
): MealPlanEntry => ({
  baseServings: 4,
  cookChoice: COOK_CHOICE.SELF,
  cookLabel: "Yo",
  dateKey,
  id,
  mealType,
  multiplierLabel: null,
  recipeId: `recipe-${recipeName}`,
  recipeName,
  servingsMultiplier: 1,
});

/** Una respuesta que el test decide cuándo llega (o cuándo falla). */
export const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (error: Error) => void = () => undefined;
  const promise = new Promise<Value>((onResolve, onReject) => {
    resolve = onResolve;
    reject = onReject;
  });
  return { promise, reject, resolve };
};

/** Un día de la semana con sus tres espacios, sin textos armados: lo justo para contar comidas y armar rangos. */
export const createDay = (dateKey: string): WeekDay => ({
  dateKey,
  isToday: false,
  longLabel: dateKey,
  shortLabel: dateKey,
  slots: [
    { label: "Desayuno", mealType: MEAL_TYPE.BREAKFAST },
    { label: "Almuerzo", mealType: MEAL_TYPE.LUNCH },
    { label: "Cena", mealType: MEAL_TYPE.DINNER },
  ],
});

import { COOK_CHOICE } from "../constants/meal-planner.constants";
import type { MealPlanEntry } from "../models/meal-plan.interfaces";

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

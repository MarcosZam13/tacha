import type { NullableRef } from "@/types/nullable.types";
import type { CookChoiceType } from "./meal-plan.types";
import type { MealTypeType } from "./meal-planner.types";

// Interfaces del plan semanal (SCRUM-100), en el orden en que se usan: lo que
// devuelve la base, lo que ve la pantalla, y las mutaciones. Los types (las
// uniones de estados y de acciones) están en meal-plan.types.ts. Las de la
// grilla (WeekDay, WeekSlot) siguen en meal-planner.interfaces.ts.

/**
 * Una fila de meal_plans tal como la devuelve MEAL_PLAN_DB.PLAN_SELECT, con su
 * receta embebida. Solo la conoce el adapter (utils/toMealPlanEntry.ts).
 */
export interface MealPlanRow {
  assigned_cook: NullableRef<string>;
  date: string;
  id: string;
  meal_type: string;
  recipes: { base_servings: number; id: string; name: string };
  servings_multiplier: number;
}

/** Un espacio asignado listo para la grilla y el diálogo: los textos ya vienen armados. */
export interface MealPlanEntry {
  baseServings: number;
  /** "Yo" si el usuario cocina; null si no hay cocinero. */
  cookLabel: NullableRef<string>;
  cookChoice: CookChoiceType;
  /** "2026-10-12": el día del espacio, en hora local. */
  dateKey: string;
  id: string;
  mealType: MealTypeType;
  /** "×2"; null si el multiplicador es ×1 (no se muestra). */
  multiplierLabel: NullableRef<string>;
  recipeId: string;
  recipeName: string;
  servingsMultiplier: number;
}

/** Una receta tal como la devuelve MEAL_PLAN_DB.RECIPE_OPTIONS_SELECT. */
export interface RecipeOptionRow {
  base_servings: number;
  id: string;
  name: string;
}

/** Una receta que se puede elegir en el diálogo. */
export interface RecipeOption {
  baseServings: number;
  id: string;
  name: string;
  /** "4 porciones": las porciones base, para decidir entre recetas. */
  servingsLabel: string;
}

/** Qué espacio se está asignando: el día y la comida. */
export interface MealSlotTarget {
  dateKey: string;
  mealType: MealTypeType;
}

/** Lo que el usuario va eligiendo en el diálogo. */
export interface MealSlotFormValues {
  cookChoice: CookChoiceType;
  /** null mientras no elige una receta: "Guardar" sigue deshabilitado. */
  recipeId: NullableRef<string>;
  servingsMultiplier: number;
}

/** El rango de fechas que se pide al cargar el plan: de la semana actual a la próxima. */
export interface GetMealPlanParams {
  fromDateKey: string;
  toDateKey: string;
}

/**
 * Lo que se manda para asignar un espacio (nextjs-enterprise-patterns §4). El
 * cocinero va como `cookChoice` y no como un id: el id del usuario lo pone la base.
 */
export interface SaveMealSlotPayload extends MealSlotTarget {
  cookChoice: CookChoiceType;
  recipeId: string;
  servingsMultiplier: number;
}

/** El id de la fila creada o reemplazada. */
export interface SaveMealSlotResponse {
  slotId: string;
}

/** Lo que se manda para quitar un espacio. */
export type ClearMealSlotPayload = MealSlotTarget;

/** El espacio que quedó vacío. */
export type ClearMealSlotResponse = MealSlotTarget;

import type {
  COOK_OPTIONS_STATUS,
  MEAL_PLAN_STATUS,
  MEAL_SLOT_DIALOG_ACTION,
  MEAL_SLOT_DIALOG_STATUS,
  RECIPE_OPTIONS_STATUS,
  SAVE_SLOT_RESULT,
} from "../constants/meal-planner.constants";
import type { PlanScopeType } from "./meal-planner.types";
import type { CookOption, MealPlanEntry, MealSlotFormValues, MealSlotTarget, RecipeOption } from "./meal-plan.interfaces";

// Types del plan semanal (SCRUM-100): las uniones de estados y de acciones,
// derivadas de las constantes. Las interfaces están en meal-plan.interfaces.ts.

/** Quién cocina: un valor de COOK_CHOICE o, en el plan de la familia, el id de otro miembro. */
export type CookChoiceType = string;

export type CookOptionsStatusType = (typeof COOK_OPTIONS_STATUS)[keyof typeof COOK_OPTIONS_STATUS];

/** Qué pasa con la lista de recetas del diálogo: cargando, error o lista. */
export type RecipeOptionsStatusType = (typeof RECIPE_OPTIONS_STATUS)[keyof typeof RECIPE_OPTIONS_STATUS];

/**
 * El plan cargado para las dos semanas. Unión discriminada por `status`: solo
 * `ready` tiene entradas, así que no se puede dibujar un plan sin haberlo leído.
 */
export type MealPlanState =
  | { status: typeof MEAL_PLAN_STATUS.LOADING }
  | { status: typeof MEAL_PLAN_STATUS.ERROR }
  | { status: typeof MEAL_PLAN_STATUS.READY; entries: MealPlanEntry[] };

/** El plan cargado y de cuál es: al cambiar de plan, lo del anterior no cuenta. */
export interface LoadedMealPlan {
  scope: PlanScopeType;
  state: MealPlanState;
}

/** Cómo terminó guardar un espacio; solo si se guardó hay id. */
export type SaveSlotResult =
  | { kind: typeof SAVE_SLOT_RESULT.SAVED; slotId: string }
  | { kind: Exclude<(typeof SAVE_SLOT_RESULT)[keyof typeof SAVE_SLOT_RESULT], typeof SAVE_SLOT_RESULT.SAVED> };

/** Los otros miembros que se pueden elegir de cocinero. */
export type CookOptionsState =
  | { status: typeof COOK_OPTIONS_STATUS.LOADING }
  | { status: typeof COOK_OPTIONS_STATUS.ERROR }
  | { status: typeof COOK_OPTIONS_STATUS.READY; members: CookOption[] };

/** Las recetas que se pueden elegir en el diálogo. */
export type RecipeOptionsState =
  | { status: typeof RECIPE_OPTIONS_STATUS.LOADING }
  | { status: typeof RECIPE_OPTIONS_STATUS.ERROR }
  | { status: typeof RECIPE_OPTIONS_STATUS.READY; options: RecipeOption[] };

/**
 * El diálogo de asignar. Fuera de `closed` siempre hay un espacio elegido y
 * los valores del formulario, y solo `failed` tiene un mensaje de error: no
 * puede haber "guardando" sin saber qué se guarda.
 */
export type MealSlotDialogState =
  | { status: typeof MEAL_SLOT_DIALOG_STATUS.CLOSED }
  | { status: typeof MEAL_SLOT_DIALOG_STATUS.EDITING; target: MealSlotTarget; values: MealSlotFormValues }
  | { status: typeof MEAL_SLOT_DIALOG_STATUS.SAVING; target: MealSlotTarget; values: MealSlotFormValues }
  | {
      status: typeof MEAL_SLOT_DIALOG_STATUS.FAILED;
      target: MealSlotTarget;
      values: MealSlotFormValues;
      errorMessage: string;
    };

/** Acciones del reducer del diálogo (utils/meal-slot-dialog.reducer.ts). */
export type MealSlotDialogAction =
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.OPENED; target: MealSlotTarget; values: MealSlotFormValues }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.RECIPE_CHOSEN; recipeId: string }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.COOK_CHANGED; cookChoice: CookChoiceType }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_INCREASED }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.MULTIPLIER_DECREASED }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.SAVE_STARTED }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.SAVE_FAILED; errorMessage: string }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.SAVE_SUCCEEDED }
  | { type: typeof MEAL_SLOT_DIALOG_ACTION.CLOSED };

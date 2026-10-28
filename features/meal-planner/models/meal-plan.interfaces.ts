import type { NullableRef } from "@/types/nullable.types";
import type { CookChoiceType, RecipeOptionsStatusType } from "./meal-plan.types";
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

/** Lo crudo de un espacio asignado: con esto se arma la MealPlanEntry (los textos se derivan). */
export interface MealPlanEntryParts {
  baseServings: number;
  cookChoice: CookChoiceType;
  dateKey: string;
  id: string;
  mealType: MealTypeType;
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

/** Lo que hace falta para armar la entrada que queda en pantalla después de guardar. */
export interface SavedMealSlot {
  option: RecipeOption;
  slotId: string;
  target: MealSlotTarget;
  values: MealSlotFormValues;
}

/** El id de la fila creada o reemplazada. */
export interface SaveMealSlotResponse {
  slotId: string;
}

/** Lo que se manda para quitar un espacio. */
export type ClearMealSlotPayload = MealSlotTarget;

/** El espacio que quedó vacío. */
export type ClearMealSlotResponse = MealSlotTarget;

// --- ViewModels de los hooks (SCRUM-100) ---

/** Lo que usa `useWeekMealPlan`: el rango de fechas que pide, o null mientras no se conoce "hoy". */
export interface UseWeekMealPlanParams {
  range: NullableRef<GetMealPlanParams>;
}

/** El plan cargado y cómo cambiarlo desde el diálogo: lo que useWeekMealPlan entrega. */
export interface WeekMealPlanViewModel {
  /** La asignación de un espacio; null si está vacío o el plan todavía no se leyó. */
  getEntry: (dateKey: string, mealType: MealTypeType) => NullableRef<MealPlanEntry>;
  /** true si falló la carga del plan: los espacios no se pueden tocar y se ofrece reintentar. */
  hasLoadError: boolean;
  /** true cuando el plan ya se leyó: antes, los espacios están deshabilitados. */
  isPlanReady: boolean;
  onPlanRetry: () => void;
  /** Quita del estado la entrada de un espacio (después de quitarla en la base). */
  removeEntry: (target: MealSlotTarget) => void;
  /** Quita del estado todos los espacios de una receta que ya no existe (lo que hizo el cascade en la base). */
  removeRecipeSlots: (recipeId: string) => void;
  /** Pone en el estado una entrada guardada: reemplaza la del espacio o la agrega. */
  saveEntry: (entry: MealPlanEntry) => void;
}

/** Lo que usa `useMealSlotDialog`: dónde leer una asignación y a quién avisar de un cambio. */
export interface UseMealSlotDialogParams {
  /** "Lunes 12" para un día de la semana; null si ese día no está a la vista. Arma el subtítulo. */
  getDayLongLabel: (dateKey: string) => NullableRef<string>;
  getEntry: WeekMealPlanViewModel["getEntry"];
  onRecipeGone: WeekMealPlanViewModel["removeRecipeSlots"];
  onRemoved: WeekMealPlanViewModel["removeEntry"];
  onSaved: WeekMealPlanViewModel["saveEntry"];
}

/** Lo que useMealSlotDialog le entrega a MealPlanner.tsx: el diálogo ya calculado. */
export interface MealSlotDialogViewModel {
  canDecreaseServings: boolean;
  canIncreaseServings: boolean;
  /** Hay una receta válida elegida, las recetas están cargadas y no se está guardando. */
  canSave: boolean;
  cookChoice: CookChoiceType;
  /** El error de guardar, quitar o de la receta que ya no existe; null si no hay. */
  errorMessage: NullableRef<string>;
  /** true si el espacio ya tenía una asignación: muestra "Quitar" y el título "Cambiar comida". */
  isAssigned: boolean;
  isOpen: boolean;
  /** true mientras guarda o quita: los botones se deshabilitan y no se cierra. */
  isSaving: boolean;
  /** "×1": el multiplicador elegido, para mostrarlo mientras no hay receta con porciones. */
  multiplierLabel: string;
  onClose: () => void;
  onCookChange: (cookChoice: CookChoiceType) => void;
  onMultiplierDecrease: () => void;
  onMultiplierIncrease: () => void;
  onRecipeChoose: (recipeId: string) => void;
  onRecipesRetry: () => void;
  onRemove: () => void;
  onSave: () => void;
  /** `opener` es el botón tocado: el foco vuelve a él al cerrar (Safari no enfoca los botones al hacer clic). */
  onSlotOpen: (target: MealSlotTarget, opener?: HTMLElement) => void;
  recipeOptions: RecipeOption[];
  recipesStatus: RecipeOptionsStatusType;
  /** La receta elegida, solo si sigue entre las opciones; null si no hay o ya no existe. */
  selectedRecipeId: NullableRef<string>;
  /** "×2 · 24 porciones"; null mientras no hay receta elegida. */
  servingsSummary: NullableRef<string>;
  /** "Almuerzo del lunes 12"; null con el diálogo cerrado. */
  subtitle: NullableRef<string>;
  /** "Asignar comida" o "Cambiar comida". */
  title: string;
}

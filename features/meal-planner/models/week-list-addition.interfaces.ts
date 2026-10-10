import type { NullableRef } from "@/types/nullable.types";
import type { MealPlanEntry } from "./meal-plan.interfaces";
import type { WeekDay } from "./meal-planner.interfaces";

// Interfaces de agregar la semana a la lista (SCRUM-101), en el orden en que se
// usan: lo que devuelve la base, lo que se manda, lo que ve la pantalla. Los
// types (estados y acciones) están en week-list-addition.types.ts.

/** Lunes y domingo de la semana a la vista, como claves "2026-10-12" (hora local). */
export interface WeekRange {
  fromDateKey: string;
  toDateKey: string;
}

/**
 * Lo que devuelve la RPC add_week_to_general_list (022), tal cual. Solo lo
 * conoce el adapter (utils/toAddWeekToListResponse.ts).
 */
export interface AddWeekToListRow {
  added: string[];
  ingredients: number;
  meals: number;
  missing: { product_name: string; quantity: number; unit: string }[];
  skipped: string[];
}

/** Lo que se manda para agregar la semana: solo el rango; lo demás lo calcula la base. */
export type AddWeekToListPayload = WeekRange;

/** Resultado de agregar la semana, ya adaptado. */
export interface AddWeekToListResponse {
  addedProductNames: string[];
  /** Ingredientes distintos que quedaron en la lista. */
  ingredientCount: number;
  /** Comidas de la semana que se agregaron. */
  mealCount: number;
  /** Productos que no alcanzaron, sin repetir (el detalle por unidad no se muestra). */
  missingProductNames: string[];
  /** Productos sin ninguna presentación en el catálogo: no se agregaron. */
  skippedProductNames: string[];
}

/** Lo que usa useWeekListAddition: la semana a la vista y el plan ya cargado. */
export interface UseWeekListAdditionParams {
  days: WeekDay[];
  getEntry: (dateKey: string, mealType: MealPlanEntry["mealType"]) => NullableRef<MealPlanEntry>;
  /** true mientras otro diálogo (el de asignar) está abierto: solo uno a la vez. */
  isBlocked: boolean;
  isPlanReady: boolean;
  /** "12 – 18 oct": el rango que dice la confirmación. */
  rangeLabel: NullableRef<string>;
}

/** Lo que useWeekListAddition le entrega a MealPlanner.tsx, ya calculado. */
export interface WeekListAdditionViewModel {
  /** El botón "Agregar semana a la lista" está habilitado: hay comidas, el plan está listo y no hay otro diálogo. */
  canOpen: boolean;
  /** La frase de la confirmación; null con el diálogo cerrado. */
  confirmMessage: NullableRef<string>;
  /** El error de agregar; null si no hay. */
  errorMessage: NullableRef<string>;
  /** true mientras agrega: los botones se deshabilitan y no se cierra. */
  isAdding: boolean;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onOpen: () => void;
  /** Las líneas del aviso final de la semana a la vista; null si no hay o es de otra semana. */
  resultLines: NullableRef<string[]>;
}

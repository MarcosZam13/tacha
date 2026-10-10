import type { WEEK_LIST_ACTION, WEEK_LIST_STATUS } from "../constants/meal-planner.constants";
import type { WeekRange } from "./week-list-addition.interfaces";

// Types de agregar la semana a la lista (SCRUM-101): las uniones de estados y
// de acciones, derivadas de las constantes. Las interfaces están en
// week-list-addition.interfaces.ts.

/**
 * El diálogo de agregar la semana y su resultado. Fuera de `closed` siempre hay
 * una semana elegida; solo `failed` tiene un mensaje de error y solo `done`
 * tiene el resumen: no puede haber "agregando" sin saber qué semana se agrega.
 */
export type WeekListState =
  | { status: typeof WEEK_LIST_STATUS.CLOSED }
  | { status: typeof WEEK_LIST_STATUS.CONFIRMING; range: WeekRange; mealCount: number }
  | { status: typeof WEEK_LIST_STATUS.ADDING; range: WeekRange; mealCount: number }
  | { status: typeof WEEK_LIST_STATUS.FAILED; range: WeekRange; mealCount: number; errorMessage: string }
  | { status: typeof WEEK_LIST_STATUS.DONE; range: WeekRange; summaryLines: string[] };

/** Acciones del reducer (utils/week-list-addition.reducer.ts). */
export type WeekListAction =
  | { type: typeof WEEK_LIST_ACTION.OPENED; range: WeekRange; mealCount: number }
  | { type: typeof WEEK_LIST_ACTION.CONFIRMED }
  | { type: typeof WEEK_LIST_ACTION.SUCCEEDED; summaryLines: string[] }
  | { type: typeof WEEK_LIST_ACTION.FAILED; errorMessage: string }
  | { type: typeof WEEK_LIST_ACTION.CLOSED };

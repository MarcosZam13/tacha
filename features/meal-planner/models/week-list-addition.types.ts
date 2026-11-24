import type {
  DATE_LIST_OPTIONS_STATUS,
  WEEK_LIST_ACTION,
  WEEK_LIST_DESTINATION,
  WEEK_LIST_STATUS,
} from "../constants/meal-planner.constants";
import type { DateListOption, WeekRange } from "./week-list-addition.interfaces";

// Types de agregar la semana a la lista (SCRUM-101): las uniones de estados y
// de acciones, derivadas de las constantes. Las interfaces están en
// week-list-addition.interfaces.ts.

/** A qué lista se agrega la semana: la general o una sublista por fecha (SCRUM-160). */
export type WeekListDestination =
  | { kind: typeof WEEK_LIST_DESTINATION.GENERAL }
  | ({ kind: typeof WEEK_LIST_DESTINATION.DATE_LIST } & Pick<DateListOption, "id" | "name">);

/** La carga de las sublistas que se pueden elegir; solo `ready` tiene opciones. */
export type DateListOptionsState =
  | { status: typeof DATE_LIST_OPTIONS_STATUS.IDLE }
  | { status: typeof DATE_LIST_OPTIONS_STATUS.LOADING }
  | { status: typeof DATE_LIST_OPTIONS_STATUS.FAILED }
  | { status: typeof DATE_LIST_OPTIONS_STATUS.READY; options: DateListOption[] };

/**
 * El diálogo de agregar la semana y su resultado. Fuera de `closed` siempre hay
 * una semana elegida; solo `failed` tiene un mensaje de error y solo `done`
 * tiene el resumen: no puede haber "agregando" sin saber qué semana se agrega.
 */
export type WeekListState =
  | { status: typeof WEEK_LIST_STATUS.CLOSED }
  | { status: typeof WEEK_LIST_STATUS.CONFIRMING; range: WeekRange; mealCount: number; destination: WeekListDestination }
  | { status: typeof WEEK_LIST_STATUS.ADDING; range: WeekRange; mealCount: number; destination: WeekListDestination }
  | {
      status: typeof WEEK_LIST_STATUS.FAILED;
      range: WeekRange;
      mealCount: number;
      destination: WeekListDestination;
      errorMessage: string;
    }
  | {
      status: typeof WEEK_LIST_STATUS.DONE;
      range: WeekRange;
      destination: WeekListDestination;
      summaryLines: string[];
    };

/** Acciones del reducer (utils/week-list-addition.reducer.ts). */
export type WeekListAction =
  | { type: typeof WEEK_LIST_ACTION.OPENED; range: WeekRange; mealCount: number }
  | { type: typeof WEEK_LIST_ACTION.CONFIRMED }
  | { type: typeof WEEK_LIST_ACTION.DESTINATION_CHANGED; destination: WeekListDestination }
  | { type: typeof WEEK_LIST_ACTION.DESTINATION_LOST; errorMessage: string }
  | { type: typeof WEEK_LIST_ACTION.SUCCEEDED; summaryLines: string[] }
  | { type: typeof WEEK_LIST_ACTION.FAILED; errorMessage: string }
  | { type: typeof WEEK_LIST_ACTION.CLOSED };

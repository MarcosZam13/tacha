import type { NullableRef } from "@/types/nullable.types";
import type { MealSlotDialogViewModel, WeekMealPlanViewModel } from "./meal-plan.interfaces";
import type { MealTypeType } from "./meal-planner.types";
import type { WeekListAdditionViewModel } from "./week-list-addition.interfaces";

// Interfaces del planificador semanal (SCRUM-99). Los types (la semana a la
// vista y el tipo de comida) están en meal-planner.types.ts.

/** Un espacio del día (qué comida es). Si tiene receta o no lo dice el plan (MealPlanEntry), no este modelo. */
export interface WeekSlot {
  /** "Almuerzo". */
  label: string;
  mealType: MealTypeType;
}

/** Un día de la semana listo para dibujar: los textos ya vienen armados. */
export interface WeekDay {
  /** "2026-10-12", en hora local: la misma clave con la que se busca en meal_plans.date. */
  dateKey: string;
  isToday: boolean;
  /** "Lunes 12", para mobile. */
  longLabel: string;
  /** "Lun 12", para la grilla de desktop. */
  shortLabel: string;
  /** Los 3 espacios, en el orden de MEAL_TYPES. */
  slots: WeekSlot[];
}

/** Lo que useMealPlannerViewModel le entrega a MealPlanner.tsx, ya calculado. */
export interface MealPlannerViewModel {
  canGoToNextWeek: boolean;
  canGoToPreviousWeek: boolean;
  /** Los 7 días de la semana a la vista; vacío mientras no se conoce "hoy". */
  days: WeekDay[];
  /** El diálogo de asignar (SCRUM-100), agrupado aparte: lo usa solo el diálogo y el espacio que lo abre. */
  dialog: MealSlotDialogViewModel;
  /** false hasta que el navegador entrega "hoy": no se dibuja una fecha que luego cambie. */
  isReady: boolean;
  onNextWeek: () => void;
  onPreviousWeek: () => void;
  /** El plan cargado (SCRUM-100): qué espacios tienen receta y si ya se puede tocar la grilla. */
  plan: Pick<WeekMealPlanViewModel, "getEntry" | "hasLoadError" | "isPlanReady" | "onPlanRetry">;
  /** "12 – 18 oct"; null mientras no se conoce "hoy". */
  rangeLabel: NullableRef<string>;
  /** Agregar la semana a la lista (SCRUM-101): el botón, la confirmación y el aviso. */
  weekAddition: WeekListAdditionViewModel;
  /** "Esta semana" o "Próxima semana". */
  weekLabel: string;
}

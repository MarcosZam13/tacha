import type { NullableRef } from "@/types/nullable.types";
import type { MealPlanEntry } from "../../models/meal-plan.interfaces";
import type { WeekSlot } from "../../models/meal-planner.interfaces";

export interface MealSlotProps {
  /** La asignación del espacio; null si está vacío. */
  entry: NullableRef<MealPlanEntry>;
  /** true mientras el plan no se leyó o falló: no se puede asignar sin saber qué hay. */
  isDisabled: boolean;
  /** El nombre accesible completo: día, comida, qué tiene y qué pasa al tocarlo. */
  label: string;
  onOpen: () => void;
  slot: WeekSlot;
}

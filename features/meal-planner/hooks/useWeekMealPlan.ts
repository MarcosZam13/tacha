import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { MEAL_PLAN_STATUS } from "../constants/meal-planner.constants";
import type {
  MealPlanEntry,
  MealSlotTarget,
  UseWeekMealPlanParams,
  WeekMealPlanViewModel,
} from "../models/meal-plan.interfaces";
import type { MealPlanState } from "../models/meal-plan.types";
import type { MealTypeType } from "../models/meal-planner.types";
import { getMealPlan } from "../services/meal-plan.service";
import { removeMealPlanEntry } from "../utils/removeMealPlanEntry";
import { removeRecipeEntries } from "../utils/removeRecipeEntries";
import { toSlotKey } from "../utils/toSlotKey";
import { upsertMealPlanEntry } from "../utils/upsertMealPlanEntry";

/**
 * El plan de las dos semanas: lo carga una vez cuando se conoce el rango (las
 * flechas no hacen otra consulta, SPEC regla 21) y deja cambiar una entrada en
 * el estado después de guardarla o quitarla en la base.
 *
 * En estado solo se guarda lo que no se puede calcular (cómo va la carga y,
 * si terminó, las entradas); el resto se deriva. useState y no useReducer: el
 * estado cambia por pocas razones y sin reglas entre campos.
 */
export const useWeekMealPlan = ({ range }: UseWeekMealPlanParams): WeekMealPlanViewModel => {
  // Arranca en "cargando": el efecto nunca tiene que hacer un setState
  // síncrono para empezar (nextjs-enterprise-patterns §3).
  const [state, setState] = useState<MealPlanState>({ status: MEAL_PLAN_STATUS.LOADING });
  // Cambia con "Reintentar" para que el efecto vuelva a correr con el mismo rango.
  const [reloadKey, setReloadKey] = useState(0);
  // Primitivos y no el objeto: el rango se arma en cada render, y su identidad cambiaría el efecto sin razón.
  const fromDateKey = range?.fromDateKey ?? null;
  const toDateKey = range?.toDateKey ?? null;

  useEffect(() => {
    // Si la pantalla se cierra antes de que responda la base, la respuesta se
    // ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    if (fromDateKey !== null && toDateKey !== null) {
      getMealPlan({ fromDateKey, toDateKey })
        .then((entries) => {
          if (!isCancelled) setState({ entries, status: MEAL_PLAN_STATUS.READY });
        })
        .catch(() => {
          if (!isCancelled) setState({ status: MEAL_PLAN_STATUS.ERROR });
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [fromDateKey, toDateKey, reloadKey]);

  const entries = state.status === MEAL_PLAN_STATUS.READY ? state.entries : [];
  const entriesBySlot = new Map(entries.map((entry) => [toSlotKey(entry.dateKey, entry.mealType), entry]));

  // Forma con función: la respuesta de la base llega después, y así cambia la
  // lista de ese momento y no la que había al tocar "Guardar".
  const saveEntry = (entry: MealPlanEntry): void => {
    setState((currentState) =>
      currentState.status === MEAL_PLAN_STATUS.READY
        ? { ...currentState, entries: upsertMealPlanEntry(currentState.entries, entry) }
        : currentState,
    );
  };

  const removeEntry = (target: MealSlotTarget): void => {
    setState((currentState) =>
      currentState.status === MEAL_PLAN_STATUS.READY
        ? { ...currentState, entries: removeMealPlanEntry(currentState.entries, target) }
        : currentState,
    );
  };

  const removeRecipeSlots = (recipeId: string): void => {
    setState((currentState) =>
      currentState.status === MEAL_PLAN_STATUS.READY
        ? { ...currentState, entries: removeRecipeEntries(currentState.entries, recipeId) }
        : currentState,
    );
  };

  const onPlanRetry = (): void => {
    setState({ status: MEAL_PLAN_STATUS.LOADING });
    setReloadKey((currentKey) => currentKey + 1);
  };

  const getEntry = (dateKey: string, mealType: MealTypeType): NullableRef<MealPlanEntry> =>
    entriesBySlot.get(toSlotKey(dateKey, mealType)) ?? null;

  return {
    getEntry,
    hasLoadError: state.status === MEAL_PLAN_STATUS.ERROR,
    isPlanReady: state.status === MEAL_PLAN_STATUS.READY,
    onPlanRetry,
    removeEntry,
    removeRecipeSlots,
    saveEntry,
  };
};

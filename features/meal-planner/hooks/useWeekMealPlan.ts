import { useEffect, useEffectEvent, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { MEAL_PLAN_STATUS } from "../constants/meal-planner.constants";
import type {
  MealPlanEntry,
  MealSlotTarget,
  UseWeekMealPlanParams,
  WeekMealPlanViewModel,
} from "../models/meal-plan.interfaces";
import type { LoadedMealPlan, MealPlanState } from "../models/meal-plan.types";
import type { MealTypeType } from "../models/meal-planner.types";
import { MEAL_PLAN_SOURCE } from "../services/meal-plan-sources";
import { removeMealPlanEntry } from "../utils/removeMealPlanEntry";
import { removeRecipeEntries } from "../utils/removeRecipeEntries";
import { toSlotKey } from "../utils/toSlotKey";
import { upsertMealPlanEntry } from "../utils/upsertMealPlanEntry";

const LOADING_PLAN: MealPlanState = { status: MEAL_PLAN_STATUS.LOADING };

/**
 * El plan de las dos semanas: lo carga una vez cuando se conoce el rango (las
 * flechas no hacen otra consulta, SPEC regla 21) y deja cambiar una entrada en
 * el estado después de guardarla o quitarla en la base.
 *
 * Al cambiar de plan (propio o de la familia) lo pide de nuevo: lo cargado lleva de
 * cuál es, así nunca se dibuja el anterior ni lo pisa una respuesta tardía.
 *
 * En estado solo se guarda lo que no se puede calcular (cómo va la carga y,
 * si terminó, las entradas); el resto se deriva. useState y no useReducer: el
 * estado cambia por pocas razones y sin reglas entre campos.
 */
export const useWeekMealPlan = ({ onHouseholdLost, range, scope }: UseWeekMealPlanParams): WeekMealPlanViewModel => {
  // Arranca en "cargando": el efecto nunca tiene que hacer un setState
  // síncrono para empezar (nextjs-enterprise-patterns §3).
  const [loaded, setLoaded] = useState<LoadedMealPlan>({ scope, state: LOADING_PLAN });
  // Cambia con "Reintentar" para que el efecto vuelva a correr con el mismo rango.
  const [reloadKey, setReloadKey] = useState(0);
  // Lo último que se cargó puede ser del otro plan.
  const state = loaded.scope === scope ? loaded.state : LOADING_PLAN;
  // Evento del efecto: no lo vuelve a correr si cambia su identidad.
  const notifyHouseholdLost = useEffectEvent(onHouseholdLost);
  // Primitivos y no el objeto: el rango se arma en cada render, y su identidad cambiaría el efecto sin razón.
  const fromDateKey = range?.fromDateKey ?? null;
  const toDateKey = range?.toDateKey ?? null;

  useEffect(() => {
    // Si la pantalla se cierra antes de que responda la base, la respuesta se
    // ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    if (fromDateKey !== null && toDateKey !== null) {
      MEAL_PLAN_SOURCE[scope]
        .getPlan({ fromDateKey, toDateKey })
        .then((entries) => {
          if (isCancelled) return;
          if (entries) setLoaded({ scope, state: { entries, status: MEAL_PLAN_STATUS.READY } });
          else notifyHouseholdLost();
        })
        .catch(() => {
          if (!isCancelled) setLoaded({ scope, state: { status: MEAL_PLAN_STATUS.ERROR } });
        });
    }

    return () => {
      isCancelled = true;
      // Al volver a este plan no se muestra lo viejo mientras se pide de nuevo.
      setLoaded({ scope, state: LOADING_PLAN });
    };
  }, [fromDateKey, toDateKey, reloadKey, scope]);

  const entries = state.status === MEAL_PLAN_STATUS.READY ? state.entries : [];
  const entriesBySlot = new Map(entries.map((entry) => [toSlotKey(entry.dateKey, entry.mealType), entry]));

  // Forma con función: la respuesta de la base llega después, y así cambia la
  // lista de ese momento y no la que había al tocar "Guardar". Si ya se ve el otro
  // plan, no hay nada que cambiar.
  const updateEntries = (update: (entries: MealPlanEntry[]) => MealPlanEntry[]): void => {
    setLoaded((current) =>
      current.scope === scope && current.state.status === MEAL_PLAN_STATUS.READY
        ? { scope, state: { ...current.state, entries: update(current.state.entries) } }
        : current,
    );
  };

  const saveEntry = (entry: MealPlanEntry): void => updateEntries((current) => upsertMealPlanEntry(current, entry));

  const removeEntry = (target: MealSlotTarget): void =>
    updateEntries((current) => removeMealPlanEntry(current, target));

  const removeRecipeSlots = (recipeId: string): void =>
    updateEntries((current) => removeRecipeEntries(current, recipeId));

  const onPlanRetry = (): void => {
    setLoaded({ scope, state: LOADING_PLAN });
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

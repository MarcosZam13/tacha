import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  RECIPE_COVERAGE_PANEL_ID_PREFIX,
  RECIPE_COVERAGE_STATUS,
  RECIPE_COVERAGE_TEXT,
} from "../constants/recipes.constants";
import type { RecipeCardCoverage, RecipeCoverageViewModel } from "../models/recipe-coverage.interfaces";
import type { RecipeCoveragePanelStatusType, RecipeCoverageState } from "../models/recipe-coverage.types";
import { getRecipeCoverage, subscribeToListChanges } from "../services/recipe-coverage.service";
import { toCoverageSummaryText } from "../utils/toCoverageSummaryText";

const CLOSED_STATE: RecipeCoverageState = { status: RECIPE_COVERAGE_STATUS.CLOSED };

/** Mensaje del panel en los estados que no son `ready`; el de carga no lleva texto (lo dibuja el Spinner). */
const getMessageText = (status: RecipeCoveragePanelStatusType): NullableRef<string> => {
  if (status === RECIPE_COVERAGE_STATUS.ERROR) return RECIPE_COVERAGE_TEXT.ERROR;
  if (status === RECIPE_COVERAGE_STATUS.NOT_FOUND) return RECIPE_COVERAGE_TEXT.NOT_FOUND;
  return null;
};

/**
 * "Ver qué falta": abre el panel de una receta, le pide a la base qué
 * ingredientes están cubiertos y se mantiene al día mientras está abierto.
 *
 * El estado que se dibuja es siempre el que devolvió la base (regla 32): un
 * cambio en list_items solo es la señal para volver a preguntar, no se aplica
 * al estado a mano. Un solo panel a la vez (regla 33).
 *
 * useState y no useReducer, igual que useRecipeDeletion: pocas transiciones y
 * sin reglas entre campos. La unión impide "listo" sin ingredientes.
 */
export const useRecipeCoverage = (): RecipeCoverageViewModel => {
  const [state, setState] = useState<RecipeCoverageState>(CLOSED_STATE);
  // Cambia con "Reintentar" para que el efecto vuelva a correr con la misma receta.
  const [reloadKey, setReloadKey] = useState(0);
  const openRecipeId = state.status === RECIPE_COVERAGE_STATUS.CLOSED ? null : state.recipeId;

  useEffect(() => {
    // Si el panel se cierra (o cambia de receta) antes de que responda la
    // base, la respuesta se ignora en vez de actualizar un panel que ya no existe.
    let isCancelled = false;
    let isRefreshing = false;
    let isRefreshPending = false;

    // Coalescencia: si llegan varios cambios seguidos (tachar varios productos),
    // los que llegan con una consulta en curso no lanzan otra; al terminar se
    // hace una sola más con el estado final.
    const refresh = async (recipeId: string): Promise<void> => {
      if (isRefreshing) {
        isRefreshPending = true;
        return;
      }
      isRefreshing = true;
      try {
        const ingredients = await getRecipeCoverage({ recipeId });
        if (isCancelled) return;
        setState(
          ingredients
            ? { ingredients, recipeId, status: RECIPE_COVERAGE_STATUS.READY }
            : { recipeId, status: RECIPE_COVERAGE_STATUS.NOT_FOUND },
        );
      } catch {
        if (isCancelled) return;
        // Si ya había un estado en pantalla se conserva y se reintenta en el
        // siguiente cambio; solo la primera carga muestra el error.
        setState((currentState) =>
          currentState.status === RECIPE_COVERAGE_STATUS.READY
            ? currentState
            : { recipeId, status: RECIPE_COVERAGE_STATUS.ERROR },
        );
      } finally {
        isRefreshing = false;
      }
      if (isRefreshPending && !isCancelled) {
        isRefreshPending = false;
        await refresh(recipeId);
      }
    };

    // Sin panel abierto no hay nada que pedir ni que escuchar. El efecto
    // siempre devuelve su limpieza (consistent-return).
    let unsubscribePromise: Promise<(() => void) | null> = Promise.resolve(null);
    if (openRecipeId !== null) {
      void refresh(openRecipeId);
      // Si no se puede suscribir, el panel sigue funcionando sin actualizarse
      // solo: "Reintentar" o cerrar y abrir lo refresca.
      unsubscribePromise = subscribeToListChanges(() => void refresh(openRecipeId)).catch(() => null);
    }

    return () => {
      isCancelled = true;
      void unsubscribePromise.then((unsubscribe) => unsubscribe?.());
    };
  }, [openRecipeId, reloadKey]);

  const onCoverageToggle = (recipeId: string): void => {
    // Mismo botón: abre y cierra. Un doble clic abre y cierra, y la limpieza
    // del efecto cancela la petición y la suscripción de la apertura.
    if (openRecipeId === recipeId) {
      setState(CLOSED_STATE);
      return;
    }
    setState({ recipeId, status: RECIPE_COVERAGE_STATUS.LOADING });
  };

  const onCoverageRetry = (): void => {
    if (openRecipeId === null) return;
    setState({ recipeId: openRecipeId, status: RECIPE_COVERAGE_STATUS.LOADING });
    setReloadKey((currentKey) => currentKey + 1);
  };

  const onRecipeRemoved = (recipeId: string): void => {
    setState((currentState) =>
      currentState.status !== RECIPE_COVERAGE_STATUS.CLOSED && currentState.recipeId === recipeId
        ? CLOSED_STATE
        : currentState,
    );
  };

  // Valores derivados: cada tarjeta se queda con lo suyo.
  const getRecipeCoverageOf = (recipeId: string): RecipeCardCoverage => {
    const panelId = `${RECIPE_COVERAGE_PANEL_ID_PREFIX}${recipeId}`;
    const closedCoverage: RecipeCardCoverage = {
      ingredients: [],
      messageText: null,
      panelId,
      panelStatus: null,
      summaryText: null,
    };
    if (state.status === RECIPE_COVERAGE_STATUS.CLOSED || state.recipeId !== recipeId) return closedCoverage;

    if (state.status === RECIPE_COVERAGE_STATUS.READY) {
      return {
        ...closedCoverage,
        ingredients: state.ingredients,
        panelStatus: state.status,
        summaryText: toCoverageSummaryText(state.ingredients),
      };
    }
    return {
      ...closedCoverage,
      messageText: getMessageText(state.status),
      panelStatus: state.status,
    };
  };

  return {
    getRecipeCoverage: getRecipeCoverageOf,
    onCoverageRetry,
    onCoverageToggle,
    onRecipeRemoved,
  };
};

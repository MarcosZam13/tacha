import { useEffect, useState } from "react";
import { RECIPE_CATALOG_STATUS, RECIPE_TEXT } from "../constants/recipes.constants";
import type { RecipeCatalogState } from "../models/RecipeCatalogState.type";
import type { RecipeCatalogViewModel } from "../models/RecipeCatalogViewModel.interface";
import { getRecipeSummaries } from "../services/recipes.service";

/**
 * Catálogo de recetas: carga al montar y le entrega a RecipeCatalog.tsx lo
 * que dibuja. En estado solo se guarda lo que no se puede calcular (en qué
 * estado está la carga y, si terminó, las recetas); el resto se deriva.
 */
export const useRecipeCatalogViewModel = (): RecipeCatalogViewModel => {
  // Arranca en "cargando": el efecto nunca tiene que hacer un setState
  // síncrono para empezar (nextjs-enterprise-patterns §3).
  const [state, setState] = useState<RecipeCatalogState>({ status: RECIPE_CATALOG_STATUS.LOADING });

  useEffect(() => {
    // Si la pantalla se cierra antes de que responda la base, la respuesta
    // se ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    getRecipeSummaries()
      .then((recipes) => {
        if (!isCancelled) setState({ recipes, status: RECIPE_CATALOG_STATUS.READY });
      })
      .catch(() => {
        if (!isCancelled) setState({ status: RECIPE_CATALOG_STATUS.ERROR });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const recipes = state.status === RECIPE_CATALOG_STATUS.READY ? state.recipes : [];

  return {
    errorMessage: state.status === RECIPE_CATALOG_STATUS.ERROR ? RECIPE_TEXT.LOAD_ERROR : null,
    hasRecipes: recipes.length > 0,
    // Con error no se dice "no tienes recetas": no se sabe si es cierto.
    isEmpty: state.status === RECIPE_CATALOG_STATUS.READY && recipes.length === 0,
    isLoading: state.status === RECIPE_CATALOG_STATUS.LOADING,
    recipes,
  };
};

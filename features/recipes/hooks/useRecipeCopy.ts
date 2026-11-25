import { useRef, useState } from "react";
import { RECIPE_COPY_STATUS, RECIPE_COPY_TEXT } from "../constants/recipes.constants";
import type { RecipeCopyStatusType } from "../constants/recipes.constants";
import type { RecipeCopyViewModel, UseRecipeCopyParams } from "../models/recipe-sharing.interfaces";
import type { RecipeCopyStatusById } from "../models/recipe-sharing.types";
import { copyRecipe } from "../services/recipe-sharing.service";

const ERROR_TEXT: Partial<Record<RecipeCopyStatusType, string>> = {
  [RECIPE_COPY_STATUS.FAILED]: RECIPE_COPY_TEXT.FAILED,
  [RECIPE_COPY_STATUS.NOT_FOUND]: RECIPE_COPY_TEXT.NOT_FOUND,
};

/** "Guardar copia personal" de las recetas de la familia: un estado por tarjeta. */
export const useRecipeCopy = ({ onCopied }: UseRecipeCopyParams): RecipeCopyViewModel => {
  const [statusById, setStatusById] = useState<RecipeCopyStatusById>({});
  // Doble clic: el segundo llega antes de que React deshabilite el botón.
  const copyingIdsRef = useRef(new Set<string>());

  const setStatus = (recipeId: string, status: RecipeCopyStatusType): void =>
    setStatusById((current) => ({ ...current, [recipeId]: status }));

  const copySelectedRecipe = async (recipeId: string): Promise<void> => {
    copyingIdsRef.current.add(recipeId);
    setStatus(recipeId, RECIPE_COPY_STATUS.COPYING);
    try {
      const isCopied = await copyRecipe(recipeId);
      setStatus(recipeId, isCopied ? RECIPE_COPY_STATUS.COPIED : RECIPE_COPY_STATUS.NOT_FOUND);
      if (isCopied) onCopied();
    } catch {
      setStatus(recipeId, RECIPE_COPY_STATUS.FAILED);
    } finally {
      copyingIdsRef.current.delete(recipeId);
    }
  };

  return {
    getRecipeCopy: (recipeId) => {
      const status = statusById[recipeId] ?? RECIPE_COPY_STATUS.IDLE;
      return {
        errorMessage: ERROR_TEXT[status] ?? null,
        isCopying: status === RECIPE_COPY_STATUS.COPYING,
        successMessage: status === RECIPE_COPY_STATUS.COPIED ? RECIPE_COPY_TEXT.COPIED : null,
      };
    },
    onCopyRequest: (recipeId) => {
      if (copyingIdsRef.current.has(recipeId)) return;
      void copySelectedRecipe(recipeId);
    },
  };
};

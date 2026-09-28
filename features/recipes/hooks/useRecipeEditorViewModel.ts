import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useProductSearch } from "@/hooks/useProductSearch";
import type { NullableUndefined } from "@/types/nullable.types";
import { RECIPE_EDITOR_STATUS, RECIPE_EDITOR_TEXT, RECIPE_ROUTE } from "../constants/recipes.constants";
import type { RecipeEditorViewModel } from "../models/RecipeEditorViewModel.interface";
import { getDefaultUnit } from "../utils/getDefaultUnit";
import { useRecipeEditor } from "./useRecipeEditor";

/**
 * Facade del editor: une el formulario (useRecipeEditor), el buscador
 * compartido del catálogo y la navegación, y le entrega a RecipeEditor.tsx
 * exactamente lo que dibuja.
 */
export const useRecipeEditorViewModel = (recipeId: NullableUndefined<string>): RecipeEditorViewModel => {
  const router = useRouter();
  const editor = useRecipeEditor(recipeId);
  const search = useProductSearch();
  const { errors, ingredientNotice, saveErrorMessage, status, values } = editor.state;

  // CA-02: el ingrediente queda ligado al producto madre desde que se elige;
  // la cantidad la escribe el usuario después, y la unidad viene sugerida.
  const onSelectProduct = (productId: string): void => {
    const product = search.results.find((result) => result.productId === productId);
    if (!product) return;
    search.clearQuery();
    editor.addIngredient({
      productId: product.productId,
      productName: product.productName,
      quantity: "",
      unit: getDefaultUnit(product),
    });
  };

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // save maneja su propio error (lo pasa al estado); acá solo se navega si guardó.
    void editor.save().then((isSaved) => {
      if (isSaved) router.push(RECIPE_ROUTE.CATALOG);
    });
  };

  return {
    baseServings: values.baseServings,
    baseServingsError: errors.baseServings,
    ingredientNotice,
    ingredients: values.ingredients.map((ingredient) => ({
      ...ingredient,
      quantityError: errors.quantityByProductId[ingredient.productId],
    })),
    ingredientsError: errors.ingredients,
    ingredientSearch: {
      errorMessage: search.errorMessage,
      hasNoResults: search.hasNoResults,
      isSearching: search.isSearching,
      onQueryChange: search.setQuery,
      onSelectOption: onSelectProduct,
      // Opción = producto madre, sin detalle de tamaño: la receta no elige presentación.
      options: search.results.map((product) => ({ id: product.productId, label: product.productName })),
      query: search.query,
    },
    isLoading: status === RECIPE_EDITOR_STATUS.LOADING,
    isNotFound: status === RECIPE_EDITOR_STATUS.NOT_FOUND,
    isSaving: status === RECIPE_EDITOR_STATUS.SAVING,
    loadErrorMessage: status === RECIPE_EDITOR_STATUS.LOAD_FAILED ? RECIPE_EDITOR_TEXT.LOAD_ERROR : null,
    name: values.name,
    nameError: errors.name,
    onBaseServingsChange: editor.changeBaseServings,
    onIngredientQuantityChange: editor.changeIngredientQuantity,
    onIngredientUnitChange: editor.changeIngredientUnit,
    onNameChange: editor.changeName,
    onRemoveIngredient: editor.removeIngredient,
    onSubmit,
    saveErrorMessage,
    showForm: status === RECIPE_EDITOR_STATUS.EDITING || status === RECIPE_EDITOR_STATUS.SAVING,
    title: recipeId ? RECIPE_EDITOR_TEXT.EDIT_TITLE : RECIPE_EDITOR_TEXT.NEW_TITLE,
  };
};

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { UNSAVED_CHANGES_SOURCE } from "@/constants";
import { useHasHousehold } from "@/hooks/useHasHousehold";
import { useProductSearch } from "@/hooks/useProductSearch";
import { useReportUnsavedChanges } from "@/hooks/useUnsavedChanges";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  RECIPE_EDITOR_STATUS,
  RECIPE_EDITOR_TEXT,
  RECIPE_PHOTO_TEXT,
  RECIPE_ROUTE,
} from "../constants/recipes.constants";
import type { RecipeEditorViewModel } from "../models/recipe-editor.interfaces";
import { getDefaultUnit } from "../utils/getDefaultUnit";
import { useRecipeEditor } from "./useRecipeEditor";
import { useRecipePhoto } from "./useRecipePhoto";

/**
 * Facade del editor: une el formulario (useRecipeEditor), la foto
 * (useRecipePhoto), el buscador compartido del catálogo y la navegación, y le entrega a RecipeEditor.tsx
 * exactamente lo que dibuja.
 */
export const useRecipeEditorViewModel = (recipeId: NullableUndefined<string>): RecipeEditorViewModel => {
  const router = useRouter();
  const editor = useRecipeEditor(recipeId);
  const search = useProductSearch();
  const {
    audience,
    errors,
    hasChanges,
    hasLostHousehold,
    ingredientNotice,
    isShared,
    savedPhoto,
    savedRecipeId,
    saveErrorMessage,
    status,
    values,
  } = editor.state;
  const photo = useRecipePhoto(savedPhoto);
  const hasHousehold = useHasHousehold();

  // Cerrar sesión (SCRUM-55) pide confirmación mientras haya una receta sin guardar.
  useReportUnsavedChanges(UNSAVED_CHANGES_SOURCE.RECIPE_EDITOR, hasChanges || photo.hasPendingChange);

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
    void editor.save(photo.change).then((isSaved) => {
      if (isSaved) router.push(RECIPE_ROUTE.CATALOG);
    });
  };

  return {
    audience: {
      audience,
      canChoose: hasHousehold && !hasLostHousehold && !isShared,
      isShared,
      onAudienceChange: editor.changeAudience,
    },
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
    photo: {
      alt: photo.isPreview ? RECIPE_PHOTO_TEXT.PREVIEW_ALT : `${RECIPE_PHOTO_TEXT.ALT_PREFIX} ${values.name}`,
      errorMessage: photo.errorMessage,
      hasPhoto: photo.hasPhoto,
      onPhotoRemove: photo.onPhotoRemove,
      onPhotoSelect: photo.onPhotoSelect,
      photoUrl: photo.photoUrl,
    },
    saveErrorMessage,
    showForm: status === RECIPE_EDITOR_STATUS.EDITING || status === RECIPE_EDITOR_STATUS.SAVING,
    // Una nueva que se guardó sin su foto ya existe: desde ahí se está editando.
    title: (recipeId ?? savedRecipeId) ? RECIPE_EDITOR_TEXT.EDIT_TITLE : RECIPE_EDITOR_TEXT.NEW_TITLE,
  };
};

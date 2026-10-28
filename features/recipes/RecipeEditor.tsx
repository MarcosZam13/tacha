"use client";

import Link from "next/link";
import { Spinner } from "@/components/ui";
import { RECIPE_EDITOR_TEXT, RECIPE_ROUTE } from "./constants/recipes.constants";
import { RecipeBasicsFields } from "./components/RecipeBasicsFields";
import { RecipeEditorActions } from "./components/RecipeEditorActions";
import { RecipeIngredientsField } from "./components/RecipeIngredientsField";
import { useRecipeEditorViewModel } from "./hooks/useRecipeEditorViewModel";
import type { RecipeEditorProps } from "./models/recipe-editor.interfaces";

/**
 * Crear o editar una receta: el mismo formulario, vacío o cargado según
 * haya recipeId. "use client" porque usa hooks y habla con Supabase desde el
 * navegador (la sesión vive en el navegador).
 */
export const RecipeEditor = ({ recipeId }: RecipeEditorProps): React.JSX.Element => {
  const viewModel = useRecipeEditorViewModel(recipeId);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
      <Link href={RECIPE_ROUTE.CATALOG} className="font-body text-sm text-tacha-teal hover:underline">
        {RECIPE_EDITOR_TEXT.BACK_TO_CATALOG}
      </Link>
      <h1 className="font-display text-3xl font-bold text-tacha-text">{viewModel.title}</h1>

      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.isNotFound ? (
        <p className="font-body text-sm text-tacha-textsec">{RECIPE_EDITOR_TEXT.NOT_FOUND}</p>
      ) : null}
      {viewModel.loadErrorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.loadErrorMessage}
        </p>
      ) : null}

      {viewModel.showForm ? (
        // noValidate: la validación la hace el ViewModel, con los mismos mensajes que la base.
        <form noValidate onSubmit={viewModel.onSubmit} className="flex flex-col gap-6">
          <RecipeBasicsFields
            baseServings={viewModel.baseServings}
            baseServingsError={viewModel.baseServingsError}
            name={viewModel.name}
            nameError={viewModel.nameError}
            onBaseServingsChange={viewModel.onBaseServingsChange}
            onNameChange={viewModel.onNameChange}
          />
          <RecipeIngredientsField
            ingredientNotice={viewModel.ingredientNotice}
            ingredients={viewModel.ingredients}
            ingredientsError={viewModel.ingredientsError}
            ingredientSearch={viewModel.ingredientSearch}
            onIngredientQuantityChange={viewModel.onIngredientQuantityChange}
            onIngredientUnitChange={viewModel.onIngredientUnitChange}
            onRemoveIngredient={viewModel.onRemoveIngredient}
          />
          {viewModel.saveErrorMessage ? (
            <p role="alert" className="font-body text-sm text-red-600">
              {viewModel.saveErrorMessage}
            </p>
          ) : null}
          <RecipeEditorActions isSaving={viewModel.isSaving} />
        </form>
      ) : null}
    </div>
  );
};

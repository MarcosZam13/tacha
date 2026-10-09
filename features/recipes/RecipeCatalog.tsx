"use client";

import Link from "next/link";
import { Spinner } from "@/components/ui";
import { RECIPE_ROUTE, RECIPE_TEXT, RECIPES_TAB } from "./constants/recipes.constants";
import { RecipeCard } from "./components/RecipeCard";
import { RecipeCatalogEmptyState } from "./components/RecipeCatalogEmptyState";
import { RecipeDeleteDialog } from "./components/RecipeDeleteDialog";
import { RecipeRepeatAddDialog } from "./components/RecipeRepeatAddDialog";
import { RecipesTabs } from "./components/RecipesTabs";
import { useRecipeCatalogViewModel } from "./hooks/useRecipeCatalogViewModel";

/**
 * Sub-tab "Recetas" de la sección Recetas. "use client" porque usa hooks y
 * habla con Supabase desde el navegador (la sesión vive en el navegador).
 */
export const RecipeCatalog = (): React.JSX.Element => {
  const viewModel = useRecipeCatalogViewModel();
  const { onDeleteRequest, ...deleteDialog } = viewModel.deletion;
  const { getRecipeAddToList, onAddRequest, ...repeatAddDialog } = viewModel.listAddition;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-tacha-text">{RECIPE_TEXT.TITLE}</h1>
        {/* Link y no Button: es navegación (CA-01 de SCRUM-95). */}
        <Link
          href={RECIPE_ROUTE.NEW}
          className="rounded-tacha-badge bg-tacha-teal px-4 py-2 font-body text-sm font-semibold text-white hover:opacity-90"
        >
          {RECIPE_TEXT.NEW_RECIPE}
        </Link>
      </div>
      <RecipesTabs activeTab={RECIPES_TAB.RECIPES} />

      {viewModel.errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.errorMessage}
        </p>
      ) : null}
      {viewModel.isLoading ? <Spinner /> : null}
      {viewModel.isEmpty ? <RecipeCatalogEmptyState /> : null}
      {viewModel.hasRecipes ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {viewModel.recipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              addToList={getRecipeAddToList(recipe.id)}
              onAddToListRequest={onAddRequest}
              onDeleteRequest={onDeleteRequest}
              recipe={recipe}
            />
          ))}
        </ul>
      ) : null}
      <RecipeDeleteDialog {...deleteDialog} />
      <RecipeRepeatAddDialog {...repeatAddDialog} />
    </div>
  );
};

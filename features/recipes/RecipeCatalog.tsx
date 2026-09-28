"use client";

import { Spinner } from "@/components/ui";
import { RECIPE_TEXT, RECIPES_TAB } from "./constants/recipes.constants";
import { RecipeCard } from "./components/RecipeCard";
import { RecipeCatalogEmptyState } from "./components/RecipeCatalogEmptyState";
import { RecipesTabs } from "./components/RecipesTabs";
import { useRecipeCatalogViewModel } from "./hooks/useRecipeCatalogViewModel";

/**
 * Sub-tab "Recetas" de la sección Recetas. "use client" porque usa hooks y
 * habla con Supabase desde el navegador (la sesión vive en el navegador).
 */
export const RecipeCatalog = (): React.JSX.Element => {
  const viewModel = useRecipeCatalogViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{RECIPE_TEXT.TITLE}</h1>
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
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </ul>
      ) : null}
    </main>
  );
};

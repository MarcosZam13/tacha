import { ProductSearch } from "@/components/product-search/ProductSearch";
import { CategoryLabel } from "@/components/ui";
import { RECIPE_EDITOR_TEXT, RECIPE_TEXT } from "../constants/recipes.constants";
import { RecipeIngredientRow } from "./RecipeIngredientRow";
import type { RecipeIngredientsFieldProps } from "./models/RecipeIngredientsFieldProps.interface";

/**
 * Sección de ingredientes: el buscador compartido del catálogo arriba (CA-01,
 * CA-03) y debajo los ingredientes ya elegidos. Solo presentación.
 */
export const RecipeIngredientsField = ({
  ingredientNotice,
  ingredients,
  ingredientsError,
  ingredientSearch,
  onIngredientQuantityChange,
  onIngredientUnitChange,
  onRemoveIngredient,
}: RecipeIngredientsFieldProps): React.JSX.Element => (
  <section className="flex flex-col gap-3">
    <CategoryLabel>{RECIPE_TEXT.INGREDIENTS_LABEL}</CategoryLabel>
    <p className="font-body text-sm text-tacha-textsec">{RECIPE_EDITOR_TEXT.INGREDIENTS_HINT}</p>

    <ProductSearch {...ingredientSearch} />

    {ingredientNotice ? (
      <p role="status" className="font-body text-sm text-tacha-terracotta">
        {ingredientNotice}
      </p>
    ) : null}
    {ingredientsError ? (
      <p role="alert" className="font-body text-sm text-red-600">
        {ingredientsError}
      </p>
    ) : null}

    {ingredients.length > 0 ? (
      <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-badge border border-tacha-border bg-tacha-surface">
        {ingredients.map((ingredient) => (
          <RecipeIngredientRow
            key={ingredient.productId}
            ingredient={ingredient}
            onQuantityChange={onIngredientQuantityChange}
            onRemove={onRemoveIngredient}
            onUnitChange={onIngredientUnitChange}
          />
        ))}
      </ul>
    ) : (
      <p className="font-body text-sm text-tacha-textsec">{RECIPE_EDITOR_TEXT.NO_INGREDIENTS}</p>
    )}
  </section>
);

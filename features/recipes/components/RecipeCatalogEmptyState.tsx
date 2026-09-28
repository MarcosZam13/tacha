import { RECIPE_TEXT } from "../constants/recipes.constants";

export const RecipeCatalogEmptyState = (): React.JSX.Element => (
  <p className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    {RECIPE_TEXT.EMPTY_CATALOG}
  </p>
);

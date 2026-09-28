import type { Metadata } from "next";
import { RecipeEditor } from "@/features/recipes/RecipeEditor";
import { RECIPE_EDITOR_TEXT } from "@/features/recipes/constants/recipes.constants";

export const metadata: Metadata = {
  title: RECIPE_EDITOR_TEXT.NEW_TITLE,
};

const NuevaRecetaPage = (): React.JSX.Element => <RecipeEditor />;

export default NuevaRecetaPage;

import type { Metadata } from "next";
import { RecipeCatalog } from "@/features/recipes/RecipeCatalog";
import { RECIPE_TEXT } from "@/features/recipes/constants/recipes.constants";

export const metadata: Metadata = {
  title: RECIPE_TEXT.TITLE,
};

const RecetasPage = (): React.JSX.Element => <RecipeCatalog />;

export default RecetasPage;

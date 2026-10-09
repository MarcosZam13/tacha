import type { Metadata } from "next";
import { RecipeEditor } from "@/features/recipes/RecipeEditor";
import { RECIPE_EDITOR_TEXT } from "@/features/recipes/constants/recipes.constants";

export const metadata: Metadata = {
  title: RECIPE_EDITOR_TEXT.EDIT_TITLE,
};

// En Next 16 los parámetros de una ruta dinámica llegan como Promise.
interface EditarRecetaPageProps {
  params: Promise<{ id: string }>;
}

const EditarRecetaPage = async ({ params }: EditarRecetaPageProps): Promise<React.JSX.Element> => {
  const { id } = await params;
  return <RecipeEditor recipeId={id} />;
};

export default EditarRecetaPage;

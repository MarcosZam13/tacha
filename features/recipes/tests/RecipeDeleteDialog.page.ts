import { screen } from "@testing-library/react";

/**
 * Page Object del diálogo de eliminar una receta: cómo encontrar sus partes.
 * Sin aserciones: las hace el test.
 */
export const createRecipeDeleteDialogPage = () => {
  const getDialog = () => screen.getByRole("dialog", { name: /eliminar esta receta/i });
  const getRecipeName = (name: string) => screen.getByText(name);
  const getMealPlanNotice = () => screen.getByRole("status");
  const queryMealPlanNotice = () => screen.queryByRole("status");
  const getDeleteButton = () => screen.getByRole("button", { name: "Eliminar" });

  return { getDeleteButton, getDialog, getMealPlanNotice, getRecipeName, queryMealPlanNotice };
};

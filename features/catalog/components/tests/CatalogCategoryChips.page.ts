import { screen } from "@testing-library/react";

/**
 * Page Object de la fila de chips de categoría: cómo encontrar el grupo y
 * cada chip por su nombre. Sin aserciones: las hace el test.
 */
export const createCatalogCategoryChipsPage = () => {
  const getGroup = (name: string) => screen.getByRole("group", { name });
  const getChip = (name: string) => screen.getByRole("button", { name });

  return { getChip, getGroup };
};

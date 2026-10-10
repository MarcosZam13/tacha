import { screen } from "@testing-library/react";

/**
 * Page Object de los sub-tabs de Recetas: cómo encontrar la navegación y sus
 * links. Sin aserciones: las hace el test.
 */
export const createRecipesTabsPage = () => {
  const getNavigation = () => screen.getByRole("navigation", { name: /secciones de recetas/i });
  const getTab = (name: RegExp) => screen.getByRole("link", { name });

  const getRecipesTab = () => getTab(/^recetas$/i);
  const getPlannerTab = () => getTab(/^planificador semanal$/i);
  const queryComingSoon = () => screen.queryByText(/próximamente/i);

  return { getNavigation, getPlannerTab, getRecipesTab, queryComingSoon };
};

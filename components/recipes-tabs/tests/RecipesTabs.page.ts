import { screen } from "@testing-library/react";
import { RECIPES_TAB, RECIPES_TAB_LABEL, RECIPES_TABS_TEXT } from "@/constants";

/**
 * Page Object de los sub-tabs de Recetas: cómo encontrar la navegación y sus
 * links. Sin aserciones: las hace el test.
 */
export const createRecipesTabsPage = () => {
  const getNavigation = () => screen.getByRole("navigation", { name: RECIPES_TABS_TEXT.NAV_LABEL });
  const getTab = (name: string) => screen.getByRole("link", { name });

  const getRecipesTab = () => getTab(RECIPES_TAB_LABEL[RECIPES_TAB.RECIPES]);
  const getPlannerTab = () => getTab(RECIPES_TAB_LABEL[RECIPES_TAB.PLANNER]);
  const queryComingSoon = () => screen.queryByText(/próximamente/i);

  return { getNavigation, getPlannerTab, getRecipesTab, queryComingSoon };
};

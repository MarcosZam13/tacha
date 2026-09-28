import { RECIPE_TEXT, RECIPES_TABS } from "../constants/recipes.constants";
import type { RecipesTabsProps } from "./models/RecipesTabsProps.interface";

/**
 * Sub-tabs de la sección "Recetas". Hoy solo hay una pantalla, así que el
 * tab activo se marca con aria-current y el que todavía no existe se muestra
 * deshabilitado. Cuando exista el planificador (SCRUM-99), los tabs
 * disponibles pasan a ser links.
 */
export const RecipesTabs = ({ activeTab }: RecipesTabsProps): React.JSX.Element => (
  <nav aria-label={RECIPE_TEXT.TABS_LABEL}>
    <ul className="flex gap-2 border-b border-tacha-border">
      {RECIPES_TABS.map((tab) => (
        <li key={tab.id}>
          {tab.isAvailable ? (
            <span
              aria-current={tab.id === activeTab ? "page" : undefined}
              className="-mb-px block border-b-2 border-tacha-teal px-3 py-2 font-body text-sm font-semibold text-tacha-teal"
            >
              {tab.label}
            </span>
          ) : (
            <span
              aria-disabled="true"
              className="block px-3 py-2 font-body text-sm text-tacha-textsec"
            >
              {tab.label} <span className="text-xs">· {RECIPE_TEXT.COMING_SOON}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  </nav>
);

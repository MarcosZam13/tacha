import { RECIPE_TEXT, RECIPES_TABS } from "../constants/recipes.constants";
import type { RecipesTabsProps } from "./models/RecipesTabsProps.interface";

/**
 * Sub-tabs de la sección "Recetas". `activeTab` decide cuál se ve activo;
 * `isAvailable` decide solo si el tab está habilitado. Hoy hay una sola
 * pantalla, así que ningún tab navega: cuando exista el planificador
 * (SCRUM-99), los disponibles pasan a ser links.
 */
export const RecipesTabs = ({ activeTab }: RecipesTabsProps): React.JSX.Element => (
  <nav aria-label={RECIPE_TEXT.TABS_LABEL}>
    <ul className="flex gap-2 border-b border-tacha-border">
      {RECIPES_TABS.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <li key={tab.id}>
            {tab.isAvailable ? (
              <span
                aria-current={isActive ? "page" : undefined}
                className={`-mb-px block border-b-2 px-3 py-2 font-body text-sm ${
                  isActive
                    ? "border-tacha-teal font-semibold text-tacha-teal"
                    : "border-transparent text-tacha-text"
                }`}
              >
                {tab.label}
              </span>
            ) : (
              <span
                aria-disabled="true"
                className="block px-3 py-2 font-body text-sm text-tacha-textsec"
              >
                {tab.label} <span className="text-xs">{RECIPE_TEXT.COMING_SOON}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </nav>
);

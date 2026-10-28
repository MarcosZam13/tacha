import Link from "next/link";
import { RECIPES_TABS, RECIPES_TABS_TEXT } from "@/constants";
import type { RecipesTabsProps } from "./models/RecipesTabsProps.interface";

/**
 * Sub-tabs de la sección "Recetas": el catálogo y el planificador semanal.
 * Son links porque cambian de pantalla (un link se puede abrir en otra
 * pestaña, y recargar o volver con "atrás" mantiene el tab). `activeTab`
 * decide cuál se ve activo y lo anuncia con aria-current="page".
 *
 * Vive en components/ porque lo usan dos features: el catálogo
 * (features/recipes) y el planificador (features/meal-planner).
 */
export const RecipesTabs = ({ activeTab }: RecipesTabsProps): React.JSX.Element => (
  <nav aria-label={RECIPES_TABS_TEXT.NAV_LABEL}>
    <ul className="flex gap-2 border-b border-tacha-border">
      {RECIPES_TABS.map((tab) => {
        const isActive = tab.id === activeTab;

        return (
          <li key={tab.id}>
            <Link
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`-mb-px block border-b-2 px-3 py-2 font-body text-sm ${
                isActive
                  ? "border-tacha-teal font-semibold text-tacha-teal"
                  : "border-transparent text-tacha-text hover:text-tacha-teal"
              }`}
            >
              {tab.label}
            </Link>
          </li>
        );
      })}
    </ul>
  </nav>
);

import Link from "next/link";
import { CATALOG_TABS, CATALOG_TABS_TEXT } from "@/constants";
import type { CatalogTabsProps } from "./models/CatalogTabsProps.interface";

/**
 * Sub-tabs de la sección "Catálogo": "Buscar" y "Mis productos". Son links
 * porque cada uno tiene su propia ruta (SCRUM-86 le dio ruta propia a "Mis
 * productos") — mismo criterio que RecipesTabs. `activeTab` decide cuál se
 * ve activo y lo anuncia con aria-current="page".
 *
 * Vive en components/ porque lo usan dos features: "Buscar" (features/catalog)
 * y "Mis productos" (features/my-products).
 */
export const CatalogTabs = ({ activeTab }: CatalogTabsProps): React.JSX.Element => (
  <nav aria-label={CATALOG_TABS_TEXT.NAV_LABEL}>
    <ul className="flex gap-2 border-b border-tacha-border">
      {CATALOG_TABS.map((tab) => {
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

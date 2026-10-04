import { CATALOG_TABS, CATALOG_TEXT } from "../constants/catalog-search.constants";
import type { CatalogTabsProps } from "./models/CatalogTabsProps.interface";

/**
 * Sub-tabs de la sección "Catálogo". `activeTab` decide cuál se ve activo;
 * `isAvailable` decide solo si el tab está habilitado. Hoy hay una sola
 * pantalla, así que ningún tab navega: cuando exista "Mis productos" los
 * disponibles pasan a ser links.
 */
export const CatalogTabs = ({ activeTab }: CatalogTabsProps): React.JSX.Element => (
  <nav aria-label={CATALOG_TEXT.TABS_LABEL}>
    <ul className="flex gap-2 border-b border-tacha-border">
      {CATALOG_TABS.map((tab) => {
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
                {tab.label} <span className="text-xs">{CATALOG_TEXT.COMING_SOON}</span>
              </span>
            )}
          </li>
        );
      })}
    </ul>
  </nav>
);

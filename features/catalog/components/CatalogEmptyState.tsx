import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { CATALOG_TEXT } from "../constants/catalog-search.constants";
import type { CatalogEmptyStateProps } from "./models/CatalogEmptyStateProps.interface";

/**
 * Sin coincidencias: lo dice y sugiere crearlo en "Mis productos" (CA-04).
 * Solo texto, sin enlace: esa pantalla todavía no existe. `message` lo
 * cambia CatalogSearch.tsx cuando el vacío es por una categoría sin
 * productos (HU-52), no por una búsqueda de texto sin coincidencias.
 */
export const CatalogEmptyState = ({
  message = PRODUCT_SEARCH_TEXT.NO_RESULTS,
}: CatalogEmptyStateProps): React.JSX.Element => (
  <div className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    <p>{message}</p>
    <p>{CATALOG_TEXT.EMPTY_SUGGESTION}</p>
  </div>
);

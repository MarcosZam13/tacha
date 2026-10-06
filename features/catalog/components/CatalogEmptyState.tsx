import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { CATALOG_TEXT } from "../constants/catalog-search.constants";

/** Sin coincidencias: lo dice y sugiere crearlo en "Mis productos" (CA-04). Solo texto, sin enlace: esa pantalla todavía no existe. */
export const CatalogEmptyState = (): React.JSX.Element => (
  <div className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    <p>{PRODUCT_SEARCH_TEXT.NO_RESULTS}</p>
    <p>{CATALOG_TEXT.EMPTY_SUGGESTION}</p>
  </div>
);

import { Button } from "@/components/ui";
import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { CREATE_PRODUCT_FORM_TEXT } from "@/constants/create-product-form.constants";
import { CATALOG_TEXT } from "../constants/catalog-search.constants";
import type { CatalogEmptyStateProps } from "./models/CatalogEmptyStateProps.interface";

/**
 * Sin coincidencias: lo dice y ofrece crearlo ahí mismo (CA-04, SCRUM-87) —
 * el mismo CreateProductForm que abre el botón de "Mis productos", con su
 * propia instancia de useCreateProductForm (CatalogSearch.tsx la crea y pasa
 * `onAddProductClick`). `message` lo cambia CatalogSearch.tsx cuando el
 * vacío es por una categoría sin productos (HU-52), no por una búsqueda de
 * texto sin coincidencias.
 */
export const CatalogEmptyState = ({
  message = PRODUCT_SEARCH_TEXT.NO_RESULTS,
  onAddProductClick,
}: CatalogEmptyStateProps): React.JSX.Element => (
  <div className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    <p>{message}</p>
    <p>{CATALOG_TEXT.EMPTY_SUGGESTION}</p>
    <div className="mt-4">
      <Button onClick={onAddProductClick}>{CREATE_PRODUCT_FORM_TEXT.OPEN_BUTTON}</Button>
    </div>
  </div>
);

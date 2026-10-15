import { MY_PRODUCTS_TEXT } from "../constants/my-products.constants";

/**
 * Estado vacío de "Mis productos" (CA-02). El texto es el del ticket
 * literal; todavía no hay acción real porque el formulario de HU-56 no existe.
 */
export const MyProductsEmptyState = (): React.JSX.Element => (
  <div className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    <p>{MY_PRODUCTS_TEXT.EMPTY_SUGGESTION}</p>
  </div>
);

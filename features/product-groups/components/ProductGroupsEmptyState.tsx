import { PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";

/**
 * Estado vacío de "Mis grupos" (CA-02 de HU-72), con el texto literal del
 * ticket. El botón "Crear tu primer grupo" llega con HU-73: sin el flujo de
 * crear sería un link a una pantalla que todavía no existe.
 */
export const ProductGroupsEmptyState = (): React.JSX.Element => (
  <p className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    {PRODUCT_GROUPS_TEXT.EMPTY_SUGGESTION}
  </p>
);

import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { KeptPersonalListSectionProps } from "./models/KeptPersonalListSectionProps.interface";
import { ShoppingListSection } from "./ShoppingListSection";

/**
 * "Mi lista personal" (SCRUM-59, D4): los pendientes de la lista que el
 * usuario eligió mantener al unirse a una familia, aparte de la lista de la
 * familia. Solo lectura: lo que se agrega ahora va a la lista de la familia
 * (CA-05). Qué más se puede hacer con ella es la decisión T2 de la SPEC.
 */
export const KeptPersonalListSection = ({ rows }: KeptPersonalListSectionProps): React.JSX.Element => (
  <div className="flex flex-col gap-2">
    <ShoppingListSection title={SHOPPING_LIST_TEXT.KEPT_PERSONAL_SECTION}>
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 font-body text-sm">
          <span className="text-tacha-text">
            {row.productName} <span className="text-tacha-textsec">{row.sizeLabel}</span>
          </span>
          <span className="text-tacha-textsec">
            {SHOPPING_LIST_TEXT.KEPT_PERSONAL_QUANTITY_PREFIX}
            {row.quantity}
          </span>
        </li>
      ))}
    </ShoppingListSection>
    <p className="font-body text-xs text-tacha-textsec">{SHOPPING_LIST_TEXT.KEPT_PERSONAL_NOTE}</p>
  </div>
);

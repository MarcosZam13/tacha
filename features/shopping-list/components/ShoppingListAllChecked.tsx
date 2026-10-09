import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";

/** Lo que muestra "Pendientes" cuando todo está tachado: la sección no desaparece (HU-36e CA-04). */
export const ShoppingListAllChecked = (): React.JSX.Element => (
  <li className="px-3 py-2 font-body text-sm text-tacha-textsec">{SHOPPING_LIST_TEXT.ALL_CHECKED}</li>
);

import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";

export const ShoppingListEmptyState = (): React.JSX.Element => (
  <p className="rounded-tacha-badge border border-dashed border-tacha-border px-4 py-8 text-center font-body text-sm text-tacha-textsec">
    {SHOPPING_LIST_TEXT.EMPTY_LIST}
  </p>
);

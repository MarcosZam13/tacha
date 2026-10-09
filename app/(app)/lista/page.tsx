import type { Metadata } from "next";
import { ShoppingList } from "@/features/shopping-list/ShoppingList";
import { SHOPPING_LIST_TEXT } from "@/features/shopping-list/constants/shopping-list.constants";

export const metadata: Metadata = {
  title: SHOPPING_LIST_TEXT.TITLE,
};

const ListaPage = (): React.JSX.Element => <ShoppingList />;

export default ListaPage;

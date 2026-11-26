import type { Metadata } from "next";
import { MyInventory } from "@/features/my-inventory/MyInventory";
import { MY_INVENTORY_TEXT } from "@/features/my-inventory/constants/my-inventory.constants";

export const metadata: Metadata = {
  title: MY_INVENTORY_TEXT.TITLE,
};

const InventarioPage = (): React.JSX.Element => <MyInventory />;

export default InventarioPage;

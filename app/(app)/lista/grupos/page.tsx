import type { Metadata } from "next";
import { ProductGroups } from "@/features/product-groups/ProductGroups";
import { PRODUCT_GROUPS_TEXT } from "@/features/product-groups/constants/product-groups.constants";

export const metadata: Metadata = {
  title: PRODUCT_GROUPS_TEXT.TITLE,
};

const GruposPage = (): React.JSX.Element => <ProductGroups />;

export default GruposPage;

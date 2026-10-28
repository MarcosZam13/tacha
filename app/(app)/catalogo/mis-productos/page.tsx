import type { Metadata } from "next";
import { MyProducts } from "@/features/my-products/MyProducts";
import { CATALOG_TABS_TEXT } from "@/constants";

export const metadata: Metadata = {
  title: CATALOG_TABS_TEXT.SECTION_TITLE,
};

const MisProductosPage = (): React.JSX.Element => <MyProducts />;

export default MisProductosPage;

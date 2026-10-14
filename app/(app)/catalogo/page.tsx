import type { Metadata } from "next";
import { CatalogSearch } from "@/features/catalog/CatalogSearch";
import { CATALOG_TABS_TEXT } from "@/constants";

export const metadata: Metadata = {
  title: CATALOG_TABS_TEXT.SECTION_TITLE,
};

const CatalogoPage = (): React.JSX.Element => <CatalogSearch />;

export default CatalogoPage;

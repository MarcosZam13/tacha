import type { Metadata } from "next";
import { CatalogSearch } from "@/features/catalog/CatalogSearch";
import { CATALOG_TEXT } from "@/features/catalog/constants/catalog-search.constants";

export const metadata: Metadata = {
  title: CATALOG_TEXT.TITLE,
};

const CatalogoPage = (): React.JSX.Element => <CatalogSearch />;

export default CatalogoPage;

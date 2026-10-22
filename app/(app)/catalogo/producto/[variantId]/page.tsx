import type { Metadata } from "next";
import { ProductDetail } from "@/features/catalog-product-detail/ProductDetail";
import { CATALOG_TABS_TEXT } from "@/constants";

export const metadata: Metadata = {
  title: CATALOG_TABS_TEXT.SECTION_TITLE,
};

// En Next 16 los parámetros de una ruta dinámica llegan como Promise.
interface ProductoPageProps {
  params: Promise<{ variantId: string }>;
}

const ProductoPage = async ({ params }: ProductoPageProps): Promise<React.JSX.Element> => {
  const { variantId } = await params;
  return <ProductDetail variantId={variantId} />;
};

export default ProductoPage;

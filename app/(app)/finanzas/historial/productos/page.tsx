import type { Metadata } from "next";
import { ProductPurchaseHistory } from "@/features/finance/ProductPurchaseHistory";
import { FINANCE_TEXT } from "@/features/finance/constants/finance.constants";

export const metadata: Metadata = {
  title: FINANCE_TEXT.TITLE,
};

const ProductPurchaseHistoryPage = (): React.JSX.Element => <ProductPurchaseHistory />;

export default ProductPurchaseHistoryPage;

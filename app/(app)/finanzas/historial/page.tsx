import type { Metadata } from "next";
import { PurchaseHistory } from "@/features/finance/PurchaseHistory";
import { FINANCE_TEXT } from "@/features/finance/constants/finance.constants";

export const metadata: Metadata = {
  title: FINANCE_TEXT.TITLE,
};

const PurchaseHistoryPage = (): React.JSX.Element => <PurchaseHistory />;

export default PurchaseHistoryPage;

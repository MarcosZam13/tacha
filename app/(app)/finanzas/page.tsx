import type { Metadata } from "next";
import { FinanceDashboard } from "@/features/finance/FinanceDashboard";
import { FINANCE_TEXT } from "@/features/finance/constants/finance.constants";

export const metadata: Metadata = {
  title: FINANCE_TEXT.TITLE,
};

const FinancePage = (): React.JSX.Element => <FinanceDashboard />;

export default FinancePage;

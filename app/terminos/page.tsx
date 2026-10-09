import type { Metadata } from "next";
import { TERMS_TEXT } from "@/features/landing/constants/terms.constants";
import { Terms } from "@/features/landing/Terms";

export const metadata: Metadata = {
  title: TERMS_TEXT.TITLE,
};

const TerminosPage = (): React.JSX.Element => <Terms />;

export default TerminosPage;

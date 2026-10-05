import type { Metadata } from "next";
import { About } from "@/features/landing/About";
import { ABOUT_TEXT } from "@/features/landing/constants/landing.constants";

export const metadata: Metadata = {
  title: ABOUT_TEXT.TITLE,
};

const NosotrosPage = (): React.JSX.Element => <About />;

export default NosotrosPage;

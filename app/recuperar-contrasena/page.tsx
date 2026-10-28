import type { Metadata } from "next";
import { ForgotPassword } from "@/features/password-recovery/ForgotPassword";
import { FORGOT_PASSWORD_LABEL } from "@/features/password-recovery/constants/password-recovery.constants";

export const metadata: Metadata = {
  title: FORGOT_PASSWORD_LABEL.TITLE,
};

const ForgotPasswordPage = (): React.JSX.Element => <ForgotPassword />;

export default ForgotPasswordPage;

import type { Metadata } from "next";
import { RESET_PASSWORD_LABEL } from "@/features/password-recovery/constants/password-recovery.constants";
import { ResetPassword } from "@/features/password-recovery/ResetPassword";

export const metadata: Metadata = {
  title: RESET_PASSWORD_LABEL.FORM_TITLE,
};

const ResetPasswordPage = (): React.JSX.Element => <ResetPassword />;

export default ResetPasswordPage;

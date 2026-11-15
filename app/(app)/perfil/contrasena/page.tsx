import type { Metadata } from "next";
import { ChangePassword } from "@/features/change-password/ChangePassword";
import { CHANGE_PASSWORD_TEXT } from "@/features/change-password/constants/change-password.constants";

export const metadata: Metadata = {
  title: CHANGE_PASSWORD_TEXT.TITLE,
};

const ChangePasswordPage = (): React.JSX.Element => <ChangePassword />;

export default ChangePasswordPage;

import type { Metadata } from "next";
import { Login } from "@/features/login/Login";
import { LOGIN_LABEL } from "@/features/login/constants/login.constants";

export const metadata: Metadata = {
  title: LOGIN_LABEL.TITLE,
};

const LoginPage = (): React.JSX.Element => <Login />;

export default LoginPage;
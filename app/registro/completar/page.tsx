import type { Metadata } from "next";
import { CompleteSignUp } from "@/features/social-sign-up/CompleteSignUp";
import { COMPLETE_SIGN_UP_LABEL } from "@/features/social-sign-up/constants/complete-sign-up.constants";

export const metadata: Metadata = {
  title: COMPLETE_SIGN_UP_LABEL.PAGE_TITLE,
};

const CompleteSignUpPage = (): React.JSX.Element => <CompleteSignUp />;

export default CompleteSignUpPage;

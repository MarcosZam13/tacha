import type { Metadata } from "next";
import { SocialSignUpCallback } from "@/features/social-sign-up/SocialSignUpCallback";
import { SOCIAL_SIGN_UP_LABEL } from "@/features/social-sign-up/constants/social-sign-up.constants";

export const metadata: Metadata = {
  title: SOCIAL_SIGN_UP_LABEL.PAGE_TITLE,
};

const SocialSignUpPage = (): React.JSX.Element => <SocialSignUpCallback />;

export default SocialSignUpPage;

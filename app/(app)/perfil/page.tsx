import type { Metadata } from "next";
import { Profile } from "@/features/profile/Profile";
import { PROFILE_TEXT } from "@/features/profile/constants/profile.constants";

export const metadata: Metadata = {
  title: PROFILE_TEXT.TITLE,
};

const ProfilePage = (): React.JSX.Element => <Profile />;

export default ProfilePage;

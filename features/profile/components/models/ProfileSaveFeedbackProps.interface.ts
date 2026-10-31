import type { ProfileViewModel } from "../../models/ProfileViewModel.interface";

export type ProfileSaveFeedbackProps = Pick<ProfileViewModel, "saveError" | "saveStatus">;

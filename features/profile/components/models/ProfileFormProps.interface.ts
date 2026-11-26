import type { ProfileViewModel } from "../../models/ProfileViewModel.interface";

export type ProfileFormProps = Omit<ProfileViewModel, "isLoading" | "savedName">;

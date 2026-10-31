import type { ProfileViewModel } from "../../models/ProfileViewModel.interface";

export type ProfilePhotoFieldProps = Pick<
  ProfileViewModel,
  "avatarUrl" | "handlePhotoRemove" | "handlePhotoSelect" | "hasPhoto" | "initials" | "photoError"
>;

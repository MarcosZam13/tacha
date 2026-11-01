import type { PROFILE_PHOTO_CHANGE } from "../constants/profile.constants";

// Qué pasa con la foto al guardar: se deja como está, se quita o se reemplaza por un archivo.
export type ProfilePhotoChange =
  | { kind: typeof PROFILE_PHOTO_CHANGE.KEEP }
  | { kind: typeof PROFILE_PHOTO_CHANGE.REMOVE }
  | { kind: typeof PROFILE_PHOTO_CHANGE.REPLACE; file: File };

export interface SaveProfilePayload {
  name: string;
  photo: ProfilePhotoChange;
}

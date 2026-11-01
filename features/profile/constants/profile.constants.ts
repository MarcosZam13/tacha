import type { NullableUndefined } from "@/types/nullable.types";

export const PROFILE_TEXT = {
  CHANGE_PHOTO: "Cambiar foto",
  NAME_LABEL: "Nombre",
  PHOTO_LABEL: "Foto de perfil",
  PHOTO_HELP: "Opcional. JPEG, PNG o WebP de hasta 2 MB.",
  REMOVE_PHOTO: "Quitar foto",
  SAVE: "Guardar cambios",
  SAVING: "Guardando...",
  TITLE: "Mi perfil",
  UNNAMED: "Sin nombre",
} as const;

export const PROFILE_ERROR_MESSAGE = {
  NAME_REQUIRED: "El nombre es obligatorio.",
  NAME_TOO_LONG: "El nombre no puede tener más de 60 caracteres.",
  PHOTO_TOO_LARGE: "La foto pesa más de 2 MB. Elegí una más liviana.",
  PHOTO_TYPE_NOT_ALLOWED: "La foto tiene que ser JPEG, PNG o WebP.",
  PHOTO_UPLOAD_FAILED: "No pudimos subir la foto. No se cambió nada, intentá de nuevo.",
  UNEXPECTED: "No pudimos guardar tus cambios. Intentá de nuevo en unos minutos.",
} as const;

export const PROFILE_SUCCESS_MESSAGE = "Cambios guardados.";

export const PROFILE_SAVE_STATUS = {
  ERROR: "error",
  IDLE: "idle",
  SAVED: "saved",
  SAVING: "saving",
} as const;

export type ProfileSaveStatusType = (typeof PROFILE_SAVE_STATUS)[keyof typeof PROFILE_SAVE_STATUS];

export const SAVE_PROFILE_RESULT = {
  ERROR: "error",
  PHOTO_ERROR: "photo-error",
  SUCCESS: "success",
} as const;

export type SaveProfileResultType = (typeof SAVE_PROFILE_RESULT)[keyof typeof SAVE_PROFILE_RESULT];

export const SAVE_PROFILE_RESULT_MESSAGE: Record<SaveProfileResultType, NullableUndefined<string>> = {
  [SAVE_PROFILE_RESULT.ERROR]: PROFILE_ERROR_MESSAGE.UNEXPECTED,
  [SAVE_PROFILE_RESULT.PHOTO_ERROR]: PROFILE_ERROR_MESSAGE.PHOTO_UPLOAD_FAILED,
  [SAVE_PROFILE_RESULT.SUCCESS]: undefined,
};

// Qué hacer con la foto al guardar. `replace` lleva el archivo; `remove` vuelve a las iniciales.
export const PROFILE_PHOTO_CHANGE = {
  KEEP: "keep",
  REMOVE: "remove",
  REPLACE: "replace",
} as const;

export type ProfilePhotoChangeKindType =
  (typeof PROFILE_PHOTO_CHANGE)[keyof typeof PROFILE_PHOTO_CHANGE];

export const PROFILE_NAME_MAX_LENGTH = 60;

// Las mismas reglas del bucket `avatars` (supabase/migrations/036_create_avatars_bucket.sql): ahí las hace
// cumplir Storage; acá solo se avisa antes de subir.
export const AVATAR_MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;

// Extensión del objeto según el tipo MIME; las claves son además la lista de tipos permitidos.
export const AVATAR_FILE_EXTENSION_BY_MIME_TYPE: Readonly<Record<string, string>> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Valor del atributo `accept` del selector de archivos.
export const AVATAR_ACCEPT = Object.keys(AVATAR_FILE_EXTENSION_BY_MIME_TYPE).join(",");

export const AVATAR_STORAGE = {
  BUCKET: "avatars",
  // Tramo de la URL pública que separa el bucket de la ruta del objeto.
  PUBLIC_URL_SEGMENT: "/storage/v1/object/public/avatars/",
} as const;

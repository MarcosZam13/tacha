import { USER_METADATA_KEY } from "@/constants";
import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { toUserProfile } from "@/utils/toUserProfile";
import {
  AVATAR_FILE_EXTENSION_BY_MIME_TYPE,
  AVATAR_STORAGE,
  PROFILE_PHOTO_CHANGE,
  SAVE_PROFILE_RESULT,
} from "../constants/profile.constants";
import type { SaveProfileResultType } from "../constants/profile.constants";
import type { ProfilePhotoChange, SaveProfilePayload } from "../models/SaveProfilePayload.interface";
import { getAvatarStoragePath } from "../utils/getAvatarStoragePath";

interface UploadedAvatar {
  path: string;
  publicUrl: string;
}

// Sube la foto a la carpeta de la persona (`<user_id>/<uuid>.<ext>`). Cada subida es un objeto nuevo: la URL
// cambia y el navegador no sirve la foto vieja desde su caché. null si no se pudo subir. La política de
// Storage exige que la carpeta sea la del usuario de la sesión.
const uploadAvatar = async (userId: string, file: File): Promise<NullableRef<UploadedAvatar>> => {
  const extension = AVATAR_FILE_EXTENSION_BY_MIME_TYPE[file.type];
  if (!extension) return null;

  const storage = getSupabaseClient().storage.from(AVATAR_STORAGE.BUCKET);
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;

  const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
  if (error) return null;

  return { path, publicUrl: storage.getPublicUrl(path).data.publicUrl };
};

// Borra un objeto del bucket sin esperar un resultado: es limpieza. Si falla queda un archivo suelto en la
// carpeta de la persona, que no afecta el perfil.
const removeAvatarObject = async (path: NullableRef<string>): Promise<void> => {
  if (!path) return;

  try {
    await getSupabaseClient().storage.from(AVATAR_STORAGE.BUCKET).remove([path]);
  } catch {
    // Nada que hacer: ver arriba.
  }
};

// El `avatar_url` que queda en el metadata: la foto nueva, ninguna (null borra la clave) o, si no hay cambio,
// no se manda la clave para dejarla como está.
const toAvatarMetadata = (
  photo: ProfilePhotoChange,
  uploaded: NullableRef<UploadedAvatar>,
): Record<string, NullableRef<string>> => {
  if (photo.kind === PROFILE_PHOTO_CHANGE.REPLACE) {
    return { [USER_METADATA_KEY.AVATAR_URL]: uploaded?.publicUrl ?? null };
  }

  return photo.kind === PROFILE_PHOTO_CHANGE.REMOVE ? { [USER_METADATA_KEY.AVATAR_URL]: null } : {};
};

/**
 * Guarda el nombre y la foto del perfil de la sesión. Devuelve un resultado, no lanza: el que llama decide
 * qué mostrar.
 *
 * Orden para fallar seguro: (1) subir la foto nueva, (2) actualizar el metadata, (3) borrar la foto anterior.
 * Si falla la subida no se toca nada. Si falla el metadata se borra la foto recién subida. Un fallo en (3)
 * solo deja un archivo suelto. Nunca queda un perfil apuntando a una foto que no existe.
 *
 * `updateUser` emite USER_UPDATED: la navegación y el perfil se actualizan solos con la sesión nueva.
 */
export const saveProfile = async ({
  name,
  photo,
}: SaveProfilePayload): Promise<SaveProfileResultType> => {
  try {
    const { data: userData, error: userError } = await getSupabaseClient().auth.getUser();
    if (userError || !userData.user) return SAVE_PROFILE_RESULT.ERROR;

    const { user } = userData;
    const previousAvatarUrl = toUserProfile(user).avatarUrl;

    const uploaded =
      photo.kind === PROFILE_PHOTO_CHANGE.REPLACE ? await uploadAvatar(user.id, photo.file) : null;
    if (photo.kind === PROFILE_PHOTO_CHANGE.REPLACE && !uploaded) return SAVE_PROFILE_RESULT.PHOTO_ERROR;

    const { error: updateError } = await getSupabaseClient().auth.updateUser({
      data: { [USER_METADATA_KEY.NAME]: name.trim(), ...toAvatarMetadata(photo, uploaded) },
    });
    if (updateError) {
      await removeAvatarObject(uploaded?.path ?? null);
      return SAVE_PROFILE_RESULT.ERROR;
    }

    if (photo.kind !== PROFILE_PHOTO_CHANGE.KEEP) {
      await removeAvatarObject(getAvatarStoragePath(previousAvatarUrl));
    }

    return SAVE_PROFILE_RESULT.SUCCESS;
  } catch {
    return SAVE_PROFILE_RESULT.ERROR;
  }
};

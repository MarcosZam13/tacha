import type { User } from "@supabase/supabase-js";
import { USER_METADATA_KEY } from "@/constants";
import type { UserProfile } from "@/types/profile.types";
import type { NullableRef } from "@/types/nullable.types";

// El user_metadata lo escribe el cliente, así que cualquier clave puede traer cualquier tipo: solo se acepta
// un texto no vacío.
const toNonEmptyText = (value: unknown): NullableRef<string> =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

/**
 * Perfil de una cuenta a partir de su user_metadata. Función pura: los casos (sin nombre, con valores de
 * otro tipo) se prueban sin React ni Supabase.
 */
export const toUserProfile = (user: Pick<User, "user_metadata">): UserProfile => ({
  avatarUrl: toNonEmptyText(user.user_metadata[USER_METADATA_KEY.AVATAR_URL]),
  name: toNonEmptyText(user.user_metadata[USER_METADATA_KEY.NAME]),
});

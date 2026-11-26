import { useEffect, useState } from "react";
import { subscribeToSessionChanges } from "@/services/session.service";
import type { NullableRef } from "@/types/nullable.types";
import type { UserProfile } from "@/types/profile.types";
import { toUserProfile } from "@/utils/toUserProfile";

/**
 * Perfil de la persona con sesión (nombre y foto), o null mientras no se sabe o si no hay sesión.
 * La fuente es la sesión de Supabase: al guardar el perfil, `updateUser` emite USER_UPDATED con la sesión
 * nueva y todo el que use este hook se redibuja, sin store compartido ni props que pasar.
 */
export const useUserProfile = (): NullableRef<UserProfile> => {
  const [profile, setProfile] = useState<NullableRef<UserProfile>>(null);

  useEffect(
    () => subscribeToSessionChanges((session) => setProfile(session ? toUserProfile(session.user) : null)),
    [],
  );

  return profile;
};

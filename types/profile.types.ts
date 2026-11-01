import type { NullableRef } from "@/types/nullable.types";

/** Los datos del perfil que ve la propia persona: salen del user_metadata de su sesión. */
export interface UserProfile {
  /** Foto de perfil (URL pública). null: se muestran las iniciales. */
  avatarUrl: NullableRef<string>;
  /** Nombre de la cuenta. null si el registro no lo guardó. */
  name: NullableRef<string>;
}

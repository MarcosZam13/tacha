import type { AvatarSizeType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

export interface ProfileAvatarProps {
  /** Foto (URL). Si falta se muestran las iniciales. */
  avatarUrl: NullableRef<string>;
  /** Iniciales del nombre. Si también faltan se muestra un ícono genérico. */
  initials: NullableRef<string>;
  size?: AvatarSizeType;
}

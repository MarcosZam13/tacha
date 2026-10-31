import { User } from "lucide-react";
import Image from "next/image";
import { Icon } from "@/components/ui";
import { AVATAR_SIZE, ICON_SIZE } from "@/constants";
import type { ProfileAvatarProps } from "./models/ProfileAvatarProps.interface";

const SIZE_CLASS_NAME: Record<string, string> = {
  [AVATAR_SIZE.LARGE]: "h-20 w-20 text-2xl",
  [AVATAR_SIZE.SMALL]: "h-8 w-8 text-xs",
};

/**
 * Foto de perfil o, sin foto, las iniciales; sin nombre, un ícono. Es decorativo (aria-hidden): el nombre
 * accesible lo pone el texto o el enlace de al lado. next/image con `unoptimized`: la foto es una URL pública
 * de Storage (o una vista previa local `blob:`) y así no hace falta configurar dominios en next.config.ts.
 */
export const ProfileAvatar = ({
  avatarUrl,
  initials,
  size = AVATAR_SIZE.SMALL,
}: ProfileAvatarProps): React.JSX.Element => (
  <span
    aria-hidden="true"
    className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-tacha-chipbg font-display font-semibold text-tacha-teal ${SIZE_CLASS_NAME[size]}`}
  >
    {avatarUrl ? (
      <Image src={avatarUrl} alt="" fill unoptimized className="object-cover" />
    ) : (
      (initials ?? <Icon icon={User} size={ICON_SIZE.MEDIUM} />)
    )}
  </span>
);

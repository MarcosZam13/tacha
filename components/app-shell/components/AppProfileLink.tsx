import Link from "next/link";
import { ProfileAvatar } from "@/components/profile-avatar/ProfileAvatar";
import { APP_SHELL_TEXT } from "../constants/app-shell.constants";
import type { AppProfileLinkProps } from "./models/AppProfileLinkProps.interface";

/**
 * Acceso al perfil: el avatar (foto o iniciales) y, en el sidebar, el nombre. Es un enlace, no un botón:
 * cambia de página. El nombre accesible siempre es "Mi perfil" más el nombre, para que la cabecera de
 * mobile (solo avatar) no quede sin etiqueta y el texto visible del sidebar quede dentro de ella.
 */
export const AppProfileLink = ({ isNameVisible, profileLink }: AppProfileLinkProps): React.JSX.Element => (
  <Link
    href={profileLink.href}
    aria-current={profileLink.isActive ? "page" : undefined}
    aria-label={profileLink.name ? `${APP_SHELL_TEXT.PROFILE_LINK_LABEL}, ${profileLink.name}` : APP_SHELL_TEXT.PROFILE_LINK_LABEL}
    className={`flex items-center gap-3 rounded-tacha-badge px-3 py-2 font-body text-sm font-semibold transition-colors ${
      profileLink.isActive ? "bg-tacha-chipbg text-tacha-teal" : "text-tacha-textsec hover:text-tacha-teal"
    }`}
  >
    <ProfileAvatar avatarUrl={profileLink.avatarUrl} initials={profileLink.initials} />
    {isNameVisible ? (
      <span className="min-w-0 truncate">{profileLink.name ?? APP_SHELL_TEXT.PROFILE_LINK_LABEL}</span>
    ) : null}
  </Link>
);

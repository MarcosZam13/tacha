import Link from "next/link";
import { APP_ROUTE } from "@/constants";
import { PROFILE_TEXT } from "../constants/profile.constants";

/** Acceso a la pantalla de cambio de contraseña (SCRUM-54), bajo el formulario del perfil. */
export const ProfileChangePasswordLink = (): React.JSX.Element => (
  <Link
    href={APP_ROUTE.CHANGE_PASSWORD}
    className="font-body text-sm font-semibold text-tacha-teal hover:underline"
  >
    {PROFILE_TEXT.CHANGE_PASSWORD}
  </Link>
);

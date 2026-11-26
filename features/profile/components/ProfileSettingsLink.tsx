import Link from "next/link";
import { APP_ROUTE } from "@/constants";
import { PROFILE_TEXT } from "../constants/profile.constants";

/** Acceso a la pantalla de Configuración (SCRUM-108): los ajustes por lista, bajo "Cambiar contraseña". */
export const ProfileSettingsLink = (): React.JSX.Element => (
  <Link href={APP_ROUTE.LIST_SETTINGS} className="font-body text-sm font-semibold text-tacha-teal hover:underline">
    {PROFILE_TEXT.SETTINGS}
  </Link>
);

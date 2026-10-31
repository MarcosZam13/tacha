import { usePathname } from "next/navigation";
import { APP_ROUTE } from "@/constants";
import { useUserProfile } from "@/hooks/useUserProfile";
import { toInitials } from "@/utils/toInitials";
import { APP_NAV_ITEMS } from "../constants/app-shell.constants";
import type { AppNavItemViewModel } from "../models/AppNavItem.interface";
import type { AppProfileLinkViewModel } from "../models/AppProfileLink.interface";
import { isRouteActive } from "../utils/isRouteActive";

interface UseAppShellViewModelReturn {
  navItems: AppNavItemViewModel[];
  profileLink: AppProfileLinkViewModel;
}

/**
 * Qué ítem de la navegación está activo y el acceso al perfil. Todo se deriva de la ruta y de la sesión en
 * cada render: no hay estado que guardar ni sincronizar, y al guardar el perfil el nombre y la foto del
 * enlace cambian solos (useUserProfile).
 */
export const useAppShellViewModel = (): UseAppShellViewModelReturn => {
  const pathname = usePathname();
  const profile = useUserProfile();

  return {
    navItems: APP_NAV_ITEMS.map((item) => ({ ...item, isActive: isRouteActive(pathname, item.href) })),
    profileLink: {
      avatarUrl: profile?.avatarUrl ?? null,
      href: APP_ROUTE.PROFILE,
      initials: toInitials(profile?.name ?? null),
      isActive: isRouteActive(pathname, APP_ROUTE.PROFILE),
      name: profile?.name ?? null,
    },
  };
};

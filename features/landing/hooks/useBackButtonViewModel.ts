import { useRouter } from "next/navigation";
import { LANDING_ROUTE } from "../constants/landing.constants";
import type { BackButtonViewModel } from "../models/BackButtonViewModel.interface";
import type { WindowWithNavigation } from "../models/BrowserNavigation.interface";

// ¿Hay una página anterior de Tacha en esta pestaña?
const hasPreviousAppPage = (): boolean => {
  const { navigation } = window as WindowWithNavigation;
  // canGoBack solo cuenta páginas de este mismo sitio: en una pestaña nueva da false.
  if (navigation) {
    return navigation.canGoBack;
  }
  // Navegadores sin Navigation API: se vuelve solo si se llegó desde una página de Tacha.
  return document.referrer.startsWith(window.location.origin);
};

export const useBackButtonViewModel = (): BackButtonViewModel => {
  const router = useRouter();

  const goBack = (): void => {
    if (hasPreviousAppPage()) {
      router.back();
      return;
    }
    router.push(LANDING_ROUTE.HOME);
  };

  return { goBack };
};

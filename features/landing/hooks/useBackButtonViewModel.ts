import { useRouter } from "next/navigation";
import { BROWSER_HISTORY, LANDING_ROUTE } from "../constants/landing.constants";
import type { BackButtonViewModel } from "../models/BackButtonViewModel.interface";

export const useBackButtonViewModel = (): BackButtonViewModel => {
  const router = useRouter();

  const goBack = (): void => {
    if (window.history.length >= BROWSER_HISTORY.MIN_ENTRIES_TO_GO_BACK) {
      router.back();
      return;
    }
    router.push(LANDING_ROUTE.HOME);
  };

  return { goBack };
};

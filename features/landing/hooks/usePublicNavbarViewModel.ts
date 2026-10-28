import { useEffect, useState } from "react";
import { APP_ROUTE, SESSION_STATUS } from "@/constants";
import type { SessionStatusType } from "@/constants";
import { subscribeToSessionChanges } from "@/services/session.service";
import { getSessionStatus } from "@/utils/getSessionStatus";
import { LANDING_ROUTE, NAVBAR_TEXT } from "../constants/landing.constants";
import type { PublicNavbarViewModel } from "../models/PublicNavbarViewModel.interface";

/**
 * Con una sesión registrada la navbar lleva a la app en vez de ofrecer
 * registrarse (SCRUM-135, CA-03). Una sesión anónima cuenta como visitante
 * (getSessionStatus). Mientras se verifica se muestra "Registrarse": es lo
 * que ve cualquier visitante y no salta si no hay sesión.
 */
export const usePublicNavbarViewModel = (): PublicNavbarViewModel => {
  const [status, setStatus] = useState<SessionStatusType>(SESSION_STATUS.CHECKING);

  // Sincroniza con algo externo (la sesión de Supabase): por eso es un efecto.
  useEffect(() => subscribeToSessionChanges((session) => setStatus(getSessionStatus(session))), []);

  return status === SESSION_STATUS.AUTHENTICATED
    ? { ctaHref: APP_ROUTE.LIST, ctaLabel: NAVBAR_TEXT.GO_TO_APP }
    : { ctaHref: LANDING_ROUTE.REGISTER, ctaLabel: NAVBAR_TEXT.REGISTER };
};

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_ROUTE } from "@/constants";
import { subscribeToSessionChanges } from "@/services/session.service";
import {
  COMPLETE_SIGN_UP_GATE_STATUS,
  COMPLETE_SIGN_UP_GATE_TIMEOUT_MS,
} from "../constants/complete-sign-up.constants";
import type { CompleteSignUpGateStatusType } from "../constants/complete-sign-up.constants";
import type { CompleteSignUpGateViewModel } from "../models/CompleteSignUpGateViewModel.interface";
import { isSocialSignUpPending } from "../utils/isSocialSignUpPending";

/**
 * Una cuenta social que no completó el registro no usa la app (SCRUM-43, tercer criterio de HU-20):
 * cualquier pantalla privada la envía a /registro/completar. No depende del guard de sesión, que
 * puede estar apagado; una sesión anónima, sin sesión o de correo pasa sin cambios.
 */
export const useCompleteSignUpGateViewModel = (): CompleteSignUpGateViewModel => {
  const router = useRouter();
  const [status, setStatus] = useState<CompleteSignUpGateStatusType>(COMPLETE_SIGN_UP_GATE_STATUS.CHECKING);

  // Sincroniza con algo externo (la sesión de Supabase): por eso es un efecto. Sigue suscrito para
  // abrir la puerta en cuanto el formulario guarda la marca (evento USER_UPDATED).
  useEffect(() => {
    const unsubscribe = subscribeToSessionChanges((session) =>
      setStatus(
        session && isSocialSignUpPending(session.user)
          ? COMPLETE_SIGN_UP_GATE_STATUS.REDIRECTING
          : COMPLETE_SIGN_UP_GATE_STATUS.OPEN,
      ),
    );

    return unsubscribe;
  }, []);

  // Tope para el indicador de carga: si la sesión no llega, no se deja la pantalla en blanco.
  useEffect(() => {
    const timeoutId = setTimeout(
      () =>
        setStatus((current) =>
          current === COMPLETE_SIGN_UP_GATE_STATUS.CHECKING ? COMPLETE_SIGN_UP_GATE_STATUS.OPEN : current,
        ),
      COMPLETE_SIGN_UP_GATE_TIMEOUT_MS,
    );

    return () => clearTimeout(timeoutId);
  }, []);

  // replace y no push: con push, "atrás" volvería a la pantalla privada y repetiría la redirección.
  useEffect(() => {
    if (status === COMPLETE_SIGN_UP_GATE_STATUS.REDIRECTING) router.replace(AUTH_ROUTE.COMPLETE_SIGN_UP);
  }, [status, router]);

  return {
    isChecking: status === COMPLETE_SIGN_UP_GATE_STATUS.CHECKING,
    isRedirecting: status === COMPLETE_SIGN_UP_GATE_STATUS.REDIRECTING,
  };
};

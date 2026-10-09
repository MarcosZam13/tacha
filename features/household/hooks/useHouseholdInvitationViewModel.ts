import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_JOIN_RESULT_STATUS,
  HOUSEHOLD_JOIN_STATUS,
  HOUSEHOLD_JOIN_TEXT,
} from "../constants/household.constants";
import type { HouseholdJoinStatusType } from "../constants/household.constants";
import { acceptHouseholdInvite, hasRegisteredSession } from "../services/household.service";
import { extractInviteToken } from "../utils/extractInviteToken";

interface UseHouseholdInvitationViewModelReturn {
  /** Texto de la tarjeta: la invitación, o por qué hace falta iniciar sesión. */
  description: NullableRef<string>;
  /** Aviso de error (role="alert" en la pantalla). */
  errorMessage: NullableRef<string>;
  isChecking: boolean;
  isJoining: boolean;
  /** "Unirme" o "Uniéndote…". */
  joinLabel: string;
  onJoin: () => void;
  showHouseholdLink: boolean;
  showJoinButton: boolean;
  showLoginLink: boolean;
  /** Confirmación (role="status", siempre montado en la pantalla). */
  statusMessage: NullableRef<string>;
}

// Qué texto acompaña a cada estado. Los que no están, no muestran ese texto.
const DESCRIPTION_BY_STATUS: Partial<Record<HouseholdJoinStatusType, string>> = {
  [HOUSEHOLD_JOIN_STATUS.FAILED]: HOUSEHOLD_JOIN_TEXT.DESCRIPTION,
  [HOUSEHOLD_JOIN_STATUS.JOINING]: HOUSEHOLD_JOIN_TEXT.DESCRIPTION,
  [HOUSEHOLD_JOIN_STATUS.NO_ACCOUNT]: HOUSEHOLD_JOIN_TEXT.NO_ACCOUNT,
  [HOUSEHOLD_JOIN_STATUS.READY]: HOUSEHOLD_JOIN_TEXT.DESCRIPTION,
};

const ERROR_BY_STATUS: Partial<Record<HouseholdJoinStatusType, string>> = {
  [HOUSEHOLD_JOIN_STATUS.EXPIRED]: HOUSEHOLD_JOIN_TEXT.EXPIRED,
  [HOUSEHOLD_JOIN_STATUS.FAILED]: HOUSEHOLD_JOIN_TEXT.FAILED,
  [HOUSEHOLD_JOIN_STATUS.IN_OTHER_HOUSEHOLD]: HOUSEHOLD_JOIN_TEXT.IN_OTHER_HOUSEHOLD,
  [HOUSEHOLD_JOIN_STATUS.INVALID]: HOUSEHOLD_JOIN_TEXT.INVALID,
  [HOUSEHOLD_JOIN_STATUS.LOAD_FAILED]: HOUSEHOLD_JOIN_TEXT.LOAD_ERROR,
};

const STATUS_MESSAGE_BY_STATUS: Partial<Record<HouseholdJoinStatusType, string>> = {
  [HOUSEHOLD_JOIN_STATUS.ALREADY_MEMBER]: HOUSEHOLD_JOIN_TEXT.ALREADY_MEMBER,
  [HOUSEHOLD_JOIN_STATUS.JOINED]: HOUSEHOLD_JOIN_TEXT.JOINED,
};

// "Unirme" se ve mientras hay algo que aceptar: lista, procesando o para reintentar.
const STATUSES_WITH_JOIN_BUTTON: readonly HouseholdJoinStatusType[] = [
  HOUSEHOLD_JOIN_STATUS.FAILED,
  HOUSEHOLD_JOIN_STATUS.JOINING,
  HOUSEHOLD_JOIN_STATUS.READY,
];

// "Ir a mi familia" se ve cuando el usuario ya tiene familia (esta u otra).
const STATUSES_WITH_HOUSEHOLD_LINK: readonly HouseholdJoinStatusType[] = [
  HOUSEHOLD_JOIN_STATUS.ALREADY_MEMBER,
  HOUSEHOLD_JOIN_STATUS.IN_OTHER_HOUSEHOLD,
  HOUSEHOLD_JOIN_STATUS.JOINED,
];

/**
 * La página /invitacion/[token]: revisa el formato del token y la sesión,
 * y une a la familia solo cuando el usuario pulsa "Unirme". Lo que decide si
 * se une (token vigente, familia, rol) lo decide la base; acá solo se traduce
 * su respuesta a lo que se muestra.
 */
export const useHouseholdInvitationViewModel = (token: string): UseHouseholdInvitationViewModelReturn => {
  // Solo para la experiencia: un token sin formato de UUID no se manda a la base.
  const inviteToken = extractInviteToken(token);

  // Arranca en "comprobando" (o directo en "no válido"): el efecto nunca hace
  // un setState síncrono para empezar.
  const [status, setStatus] = useState<HouseholdJoinStatusType>(
    inviteToken ? HOUSEHOLD_JOIN_STATUS.CHECKING : HOUSEHOLD_JOIN_STATUS.INVALID,
  );
  // true mientras hay un pedido de unión en curso. Es un ref y no estado porque
  // tiene que cambiar al instante: dos clics en el mismo render verían el mismo
  // estado "ready" y mandarían dos pedidos.
  const isJoiningRef = useRef<boolean>(false);

  useEffect(() => {
    if (!inviteToken) return undefined;

    // Si la página se cierra antes de que responda, la respuesta se ignora.
    let isCancelled = false;

    // getSession, nunca ensureSession: abrir el enlace no crea usuarios anónimos.
    hasRegisteredSession()
      .then((isRegistered) => {
        if (!isCancelled) setStatus(isRegistered ? HOUSEHOLD_JOIN_STATUS.READY : HOUSEHOLD_JOIN_STATUS.NO_ACCOUNT);
      })
      .catch(() => {
        if (!isCancelled) setStatus(HOUSEHOLD_JOIN_STATUS.LOAD_FAILED);
      });

    return () => {
      isCancelled = true;
    };
  }, [inviteToken]);

  const joinHousehold = async (validToken: string): Promise<void> => {
    if (isJoiningRef.current) return;
    isJoiningRef.current = true;
    setStatus(HOUSEHOLD_JOIN_STATUS.JOINING);

    try {
      const joinResult = await acceptHouseholdInvite(validToken);
      setStatus(HOUSEHOLD_JOIN_RESULT_STATUS[joinResult]);
    } catch {
      // Red o base: se puede reintentar. Si la primera vez sí llegó, el
      // reintento responde "already_member".
      setStatus(HOUSEHOLD_JOIN_STATUS.FAILED);
    } finally {
      isJoiningRef.current = false;
    }
  };

  const onJoin = (): void => {
    // El botón solo existe con un token válido; la guarda es para el tipo.
    if (!inviteToken) return;
    // joinHousehold maneja sus propios errores (los pasa al estado).
    void joinHousehold(inviteToken);
  };

  const isJoining = status === HOUSEHOLD_JOIN_STATUS.JOINING;

  return {
    description: DESCRIPTION_BY_STATUS[status] ?? null,
    errorMessage: ERROR_BY_STATUS[status] ?? null,
    isChecking: status === HOUSEHOLD_JOIN_STATUS.CHECKING,
    isJoining,
    joinLabel: isJoining ? HOUSEHOLD_JOIN_TEXT.JOINING : HOUSEHOLD_JOIN_TEXT.JOIN,
    onJoin,
    showHouseholdLink: STATUSES_WITH_HOUSEHOLD_LINK.includes(status),
    showJoinButton: STATUSES_WITH_JOIN_BUTTON.includes(status),
    showLoginLink: status === HOUSEHOLD_JOIN_STATUS.NO_ACCOUNT,
    statusMessage: STATUS_MESSAGE_BY_STATUS[status] ?? null,
  };
};

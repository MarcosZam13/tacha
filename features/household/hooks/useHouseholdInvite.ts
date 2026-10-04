import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_INVITE_COPY_STATUS,
  HOUSEHOLD_INVITE_DATE_FORMAT,
  HOUSEHOLD_INVITE_STATUS,
  HOUSEHOLD_INVITE_TEXT,
  HOUSEHOLD_INVITE_TIME_MS,
} from "../constants/household.constants";
import type { HouseholdInviteCopyStatusType } from "../constants/household.constants";
import type { HouseholdInvite } from "../models/HouseholdInvite.interface";
import { createHouseholdInvite, getHouseholdInvite } from "../services/household.service";

/**
 * Unión discriminada por `status`. Hay un solo lugar para el link: nunca hay
 * dos a la vez. Mientras se genera se conserva el link anterior (si había),
 * para no esconder uno vigente mientras llega el nuevo. Si el pedido falla,
 * lo que se muestra sale de volver a leer la base (ver recoverAfterGenerateFailure).
 */
type HouseholdInviteState =
  | { status: typeof HOUSEHOLD_INVITE_STATUS.EMPTY }
  | { invite: NullableRef<HouseholdInvite>; status: typeof HOUSEHOLD_INVITE_STATUS.GENERATING }
  | { status: typeof HOUSEHOLD_INVITE_STATUS.LOAD_FAILED }
  | { status: typeof HOUSEHOLD_INVITE_STATUS.LOADING }
  | {
      invite: HouseholdInvite;
      // true si este link reemplazó a otro: el anterior ya no existe en la base.
      isReplacement: boolean;
      status: typeof HOUSEHOLD_INVITE_STATUS.READY;
    };

interface UseHouseholdInviteReturn {
  copyErrorMessage: NullableRef<string>;
  expiryDateText: NullableRef<string>;
  expiryLabel: string;
  feedbackMessage: NullableRef<string>;
  generateErrorMessage: NullableRef<string>;
  generateLabel: string;
  handleCopy: () => Promise<void>;
  handleGenerate: () => Promise<void>;
  invite: NullableRef<HouseholdInvite>;
  isExpired: boolean;
  isGenerating: boolean;
  isLoading: boolean;
  loadErrorMessage: NullableRef<string>;
  /** Todavía no hay enlace: se muestra el botón "Generar enlace de invitación". */
  showInviteButton: boolean;
  statusLabel: string;
}

// Una sola instancia para todos los renders: el formato no cambia.
const expiryDateFormatter = new Intl.DateTimeFormat(
  HOUSEHOLD_INVITE_DATE_FORMAT.LOCALE,
  HOUSEHOLD_INVITE_DATE_FORMAT.OPTIONS,
);

// "¡Copiado!" tapa el aviso de reemplazo solo mientras dura; al borrarse, el
// aviso vuelve (no se sobrescribe).
const getFeedbackMessage = (
  copyStatus: HouseholdInviteCopyStatusType,
  isReplacementShown: boolean,
): NullableRef<string> => {
  if (copyStatus === HOUSEHOLD_INVITE_COPY_STATUS.COPIED) return HOUSEHOLD_INVITE_TEXT.COPIED;
  return isReplacementShown ? HOUSEHOLD_INVITE_TEXT.REPLACED : null;
};

const getGenerateLabel = (isGenerating: boolean, hasInvite: boolean): string => {
  if (isGenerating) return HOUSEHOLD_INVITE_TEXT.GENERATING;
  return hasInvite ? HOUSEHOLD_INVITE_TEXT.REGENERATE : HOUSEHOLD_INVITE_TEXT.INVITE;
};

/**
 * El link de invitación del household: lo carga (solo si el usuario es admin;
 * la base lo exige igual), lo genera o regenera, detecta el vencimiento y lo
 * copia. Token y vencimiento los decide la base; acá solo se muestran.
 */
export const useHouseholdInvite = (isAdmin: boolean): UseHouseholdInviteReturn => {
  // Arranca en "cargando": el efecto nunca hace un setState síncrono para empezar.
  const [state, setState] = useState<HouseholdInviteState>({ status: HOUSEHOLD_INVITE_STATUS.LOADING });
  // Hora (ms) del último chequeo de vencimiento: la fija el navegador al
  // recibir un link y el timer al vencer. Se guarda porque leer el reloj
  // durante el render lo haría impuro. Solo sirve para MOSTRAR "Expirado": la
  // validez real del link la decide la base.
  const [expiryCheckedAt, setExpiryCheckedAt] = useState<number>(0);
  const [copyStatus, setCopyStatus] = useState<HouseholdInviteCopyStatusType>(HOUSEHOLD_INVITE_COPY_STATUS.IDLE);
  const [hasGenerateFailed, setHasGenerateFailed] = useState<boolean>(false);
  // Número del último pedido de generación: si llegan dos respuestas fuera de
  // orden, solo se guarda la del último pedido y una vieja nunca pisa a la nueva.
  const latestGenerateRequest = useRef<number>(0);

  const invite =
    state.status === HOUSEHOLD_INVITE_STATUS.READY || state.status === HOUSEHOLD_INVITE_STATUS.GENERATING
      ? state.invite
      : null;
  const isGenerating = state.status === HOUSEHOLD_INVITE_STATUS.GENERATING;
  const isExpired = invite !== null && expiryCheckedAt >= invite.expiresAt;

  useEffect(() => {
    if (!isAdmin) return undefined;

    // Si la pantalla se cierra antes de que responda la base, la respuesta
    // se ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    getHouseholdInvite()
      .then((loadedInvite) => {
        if (isCancelled) return;
        // Se chequea el vencimiento al recibirlo: un link ya vencido se
        // muestra "Expirado" desde el primer render, sin pasar por "Activo".
        setExpiryCheckedAt(Date.now());
        setState(
          loadedInvite
            ? { invite: loadedInvite, isReplacement: false, status: HOUSEHOLD_INVITE_STATUS.READY }
            : { status: HOUSEHOLD_INVITE_STATUS.EMPTY },
        );
      })
      .catch(() => {
        if (!isCancelled) setState({ status: HOUSEHOLD_INVITE_STATUS.LOAD_FAILED });
      });

    return () => {
      isCancelled = true;
    };
  }, [isAdmin]);

  // Programa un chequeo para el momento en que vence el link actual. Al
  // cambiar de link o al desmontar, el cleanup cancela el timer anterior.
  useEffect(() => {
    const timer =
      invite && expiryCheckedAt < invite.expiresAt
        ? setTimeout(
            () => setExpiryCheckedAt(Date.now()),
            // Si el vencimiento ya pasó (ej. la pestaña estuvo dormida), 0:
            // se revisa en el próximo ciclo, nunca con un tiempo negativo.
            Math.max(invite.expiresAt - Date.now(), 0),
          )
        : undefined;

    return () => clearTimeout(timer);
  }, [invite, expiryCheckedAt]);

  // "¡Copiado!" se borra solo. Un único timer, atado a copyStatus: si cambia
  // antes o la pantalla se desmonta, el cleanup lo cancela. El fallo no se
  // borra solo: el aviso explica cómo copiar a mano y tiene que poder leerse.
  useEffect(() => {
    const timer =
      copyStatus === HOUSEHOLD_INVITE_COPY_STATUS.COPIED
        ? setTimeout(() => setCopyStatus(HOUSEHOLD_INVITE_COPY_STATUS.IDLE), HOUSEHOLD_INVITE_TIME_MS.COPY_FEEDBACK)
        : undefined;

    return () => clearTimeout(timer);
  }, [copyStatus]);

  // Si la generación falla, no se sabe si la base alcanzó a reemplazar el
  // token (la respuesta pudo perderse con la red): no se da por bueno el link
  // anterior, se vuelve a leer el vigente.
  // - Si la base ya tiene un link distinto del anterior, la generación sí
  //   ocurrió: se muestra ese link como resultado, sin error.
  // - Si tiene el mismo link (o ninguno), no ocurrió: se muestra lo que hay y el error.
  // - Si la relectura también falla, no se sabe cuál es el link vigente: no se
  //   muestra ninguno como válido y queda el error de carga.
  const recoverAfterGenerateFailure = async (
    requestNumber: number,
    previousInvite: NullableRef<HouseholdInvite>,
  ): Promise<void> => {
    try {
      const currentInvite = await getHouseholdInvite();
      if (requestNumber !== latestGenerateRequest.current) return;

      const isNewInvite = currentInvite !== null && currentInvite.url !== previousInvite?.url;
      setHasGenerateFailed(!isNewInvite);
      setExpiryCheckedAt(Date.now());
      setState(
        currentInvite
          ? {
              invite: currentInvite,
              isReplacement: isNewInvite && previousInvite !== null,
              status: HOUSEHOLD_INVITE_STATUS.READY,
            }
          : { status: HOUSEHOLD_INVITE_STATUS.EMPTY },
      );
    } catch {
      if (requestNumber !== latestGenerateRequest.current) return;
      setHasGenerateFailed(true);
      setState({ status: HOUSEHOLD_INVITE_STATUS.LOAD_FAILED });
    }
  };

  // Genera el primer link o regenera. Mientras tanto se sigue viendo el link
  // anterior (con los botones deshabilitados).
  const handleGenerate = async (): Promise<void> => {
    const requestNumber = latestGenerateRequest.current + 1;
    latestGenerateRequest.current = requestNumber;
    const previousInvite = invite;

    setHasGenerateFailed(false);
    // El resultado de copiar era del link anterior.
    setCopyStatus(HOUSEHOLD_INVITE_COPY_STATUS.IDLE);
    setState({ invite: previousInvite, status: HOUSEHOLD_INVITE_STATUS.GENERATING });

    try {
      const createdInvite = await createHouseholdInvite();
      if (requestNumber !== latestGenerateRequest.current) return;
      setExpiryCheckedAt(Date.now());
      setState({
        invite: createdInvite,
        isReplacement: previousInvite !== null,
        status: HOUSEHOLD_INVITE_STATUS.READY,
      });
    } catch {
      if (requestNumber !== latestGenerateRequest.current) return;
      await recoverAfterGenerateFailure(requestNumber, previousInvite);
    }
  };

  const handleCopy = async (): Promise<void> => {
    // Sin link, con el link vencido o mientras se reemplaza no hay nada útil
    // que copiar (la UI además oculta o deshabilita el botón).
    if (!invite || isExpired || isGenerating) return;

    // Promise.resolve().then(...) convierte en rechazo también el caso en que
    // navigator.clipboard no existe (fuera de https o localhost), que lanzaría
    // un error síncrono en vez de devolver una promesa rechazada.
    const copyResult = await Promise.resolve()
      .then(() => navigator.clipboard.writeText(invite.url))
      .then((): HouseholdInviteCopyStatusType => HOUSEHOLD_INVITE_COPY_STATUS.COPIED)
      .catch((): HouseholdInviteCopyStatusType => HOUSEHOLD_INVITE_COPY_STATUS.FAILED);

    setCopyStatus(copyResult);
  };

  const isReplacementShown = state.status === HOUSEHOLD_INVITE_STATUS.READY && state.isReplacement;

  return {
    copyErrorMessage: copyStatus === HOUSEHOLD_INVITE_COPY_STATUS.FAILED ? HOUSEHOLD_INVITE_TEXT.COPY_FAILED : null,
    expiryDateText: invite ? expiryDateFormatter.format(invite.expiresAt) : null,
    expiryLabel: isExpired ? HOUSEHOLD_INVITE_TEXT.EXPIRED_LABEL : HOUSEHOLD_INVITE_TEXT.EXPIRES_LABEL,
    feedbackMessage: getFeedbackMessage(copyStatus, isReplacementShown),
    generateErrorMessage: hasGenerateFailed ? HOUSEHOLD_INVITE_TEXT.GENERATE_ERROR : null,
    generateLabel: getGenerateLabel(isGenerating, invite !== null),
    handleCopy,
    handleGenerate,
    invite,
    isExpired,
    isGenerating,
    isLoading: state.status === HOUSEHOLD_INVITE_STATUS.LOADING,
    loadErrorMessage: state.status === HOUSEHOLD_INVITE_STATUS.LOAD_FAILED ? HOUSEHOLD_INVITE_TEXT.LOAD_ERROR : null,
    showInviteButton:
      invite === null &&
      (state.status === HOUSEHOLD_INVITE_STATUS.EMPTY || state.status === HOUSEHOLD_INVITE_STATUS.GENERATING),
    statusLabel: isExpired ? HOUSEHOLD_INVITE_TEXT.EXPIRED : HOUSEHOLD_INVITE_TEXT.ACTIVE,
  };
};

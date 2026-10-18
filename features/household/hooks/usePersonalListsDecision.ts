import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_LISTS_CHOICE,
  HOUSEHOLD_LISTS_DECISION_RESULT,
  HOUSEHOLD_LISTS_DECISION_STATE,
  HOUSEHOLD_LISTS_DECISION_STATUS,
  HOUSEHOLD_LISTS_DECISION_TEXT,
} from "../constants/household.constants";
import type {
  HouseholdListsChoiceType,
  HouseholdListsDecisionResultType,
  HouseholdListsDecisionStatusType,
} from "../constants/household.constants";
import { decidePersonalLists, getPersonalListsDecisionState } from "../services/household.service";

interface UsePersonalListsDecisionReturn {
  errorMessage: NullableRef<string>;
  isSaving: boolean;
  /** La pregunta se muestra (CA-01): es miembro y la base dice que corresponde. */
  isVisible: boolean;
  /** El aviso de lo que pasó (mantener, compartir o compartir en parte), para la zona role="status". */
  noticeMessage: NullableRef<string>;
  onKeep: () => void;
  onShare: () => void;
}

// El aviso de cada resultado. already_decided y not_member no llevan aviso:
// la pregunta desaparece y la pantalla muestra el estado real.
const getNoticeMessage = (decisionResult: HouseholdListsDecisionResultType): NullableRef<string> => {
  if (decisionResult === HOUSEHOLD_LISTS_DECISION_RESULT.KEPT) return HOUSEHOLD_LISTS_DECISION_TEXT.KEPT;
  if (decisionResult === HOUSEHOLD_LISTS_DECISION_RESULT.SHARED) return HOUSEHOLD_LISTS_DECISION_TEXT.SHARED;
  if (decisionResult === HOUSEHOLD_LISTS_DECISION_RESULT.SHARED_PARTIALLY) {
    return HOUSEHOLD_LISTS_DECISION_TEXT.SHARED_PARTIALLY;
  }
  if (decisionResult === HOUSEHOLD_LISTS_DECISION_RESULT.NOTHING_SHARED) {
    return HOUSEHOLD_LISTS_DECISION_TEXT.NOTHING_SHARED;
  }
  return null;
};

/**
 * La pregunta de HU-34b (SCRUM-59) después de crear la familia o unirse:
 * pregunta a la base si corresponde (D1, CA-02) y guarda la opción. Si
 * comparte o no, qué lista y qué pasa con los productos lo decide la base.
 *
 * Si la consulta inicial falla, no se muestra nada: no bloquea la pantalla y
 * se vuelve a preguntar la próxima vez que se abra (SPEC §7).
 */
export const usePersonalListsDecision = (isMember: boolean): UsePersonalListsDecisionReturn => {
  // Arranca escondida: el efecto nunca hace un setState síncrono para empezar.
  const [status, setStatus] = useState<HouseholdListsDecisionStatusType>(HOUSEHOLD_LISTS_DECISION_STATUS.HIDDEN);
  const [noticeMessage, setNoticeMessage] = useState<NullableRef<string>>(null);
  // Doble clic: dos clics en el mismo render ven el mismo estado (mismo
  // criterio que isLeavingRef en useHouseholdLeave).
  const isSavingRef = useRef<boolean>(false);
  // Si la pantalla se cierra mientras guarda, la respuesta se ignora.
  const isMountedRef = useRef<boolean>(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isMember) return undefined;

    let isCancelled = false;

    getPersonalListsDecisionState()
      .then((decisionState) => {
        if (isCancelled) return;
        setStatus(
          decisionState === HOUSEHOLD_LISTS_DECISION_STATE.PENDING
            ? HOUSEHOLD_LISTS_DECISION_STATUS.ASKING
            : HOUSEHOLD_LISTS_DECISION_STATUS.HIDDEN,
        );
      })
      .catch(() => {
        if (!isCancelled) setStatus(HOUSEHOLD_LISTS_DECISION_STATUS.HIDDEN);
      });

    return () => {
      isCancelled = true;
    };
  }, [isMember]);

  const decide = async (listsChoice: HouseholdListsChoiceType): Promise<void> => {
    setStatus(HOUSEHOLD_LISTS_DECISION_STATUS.SAVING);

    try {
      const decisionResult = await decidePersonalLists(listsChoice);
      if (!isMountedRef.current) return;
      setNoticeMessage(getNoticeMessage(decisionResult));
      setStatus(HOUSEHOLD_LISTS_DECISION_STATUS.HIDDEN);
    } catch {
      // Sigue la pregunta con el error: cualquiera de las dos opciones reintenta.
      // Si el primer intento sí llegó a la base, el reintento responde already_decided.
      if (isMountedRef.current) setStatus(HOUSEHOLD_LISTS_DECISION_STATUS.FAILED);
    } finally {
      isSavingRef.current = false;
    }
  };

  const choose = (listsChoice: HouseholdListsChoiceType): void => {
    const canChoose =
      status === HOUSEHOLD_LISTS_DECISION_STATUS.ASKING || status === HOUSEHOLD_LISTS_DECISION_STATUS.FAILED;
    if (!canChoose || isSavingRef.current) return;

    isSavingRef.current = true;
    void decide(listsChoice);
  };

  const isAsking =
    status === HOUSEHOLD_LISTS_DECISION_STATUS.ASKING ||
    status === HOUSEHOLD_LISTS_DECISION_STATUS.SAVING ||
    status === HOUSEHOLD_LISTS_DECISION_STATUS.FAILED;

  return {
    errorMessage: status === HOUSEHOLD_LISTS_DECISION_STATUS.FAILED ? HOUSEHOLD_LISTS_DECISION_TEXT.SAVE_ERROR : null,
    isSaving: status === HOUSEHOLD_LISTS_DECISION_STATUS.SAVING,
    isVisible: isMember && isAsking,
    noticeMessage,
    onKeep: () => choose(HOUSEHOLD_LISTS_CHOICE.KEEP),
    onShare: () => choose(HOUSEHOLD_LISTS_CHOICE.SHARE),
  };
};

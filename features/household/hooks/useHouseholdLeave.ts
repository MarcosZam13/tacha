import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_LEAVE_DIALOG_CASE,
  HOUSEHOLD_LEAVE_RESULT,
  HOUSEHOLD_LEAVE_STATUS,
  HOUSEHOLD_LEAVE_TEXT,
} from "../constants/household.constants";
import type { HouseholdLeaveDialogCaseType, HouseholdLeaveResultType } from "../constants/household.constants";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import { getHouseholdMembers, leaveHousehold } from "../services/household.service";

/**
 * Lo que ya se sabe para confirmar. newAdminCandidates son los otros miembros
 * (sin quien sale): null si no se cargaron porque sale un miembro, vacío si
 * el admin es el único miembro.
 */
interface HouseholdLeaveSelection {
  newAdminCandidates: NullableRef<HouseholdMember[]>;
  selectedNewAdminId: NullableRef<string>;
}

/** Unión discriminada por `status` (specs/SPEC.md §6): el flujo está en uno solo de estos estados. */
type HouseholdLeaveState =
  | { status: typeof HOUSEHOLD_LEAVE_STATUS.IDLE }
  // errorMessage: el aviso del intento anterior (transfer_required o
  // invalid_new_admin) mientras se recargan los miembros.
  | { errorMessage: NullableRef<string>; status: typeof HOUSEHOLD_LEAVE_STATUS.LOADING_MEMBERS }
  | { status: typeof HOUSEHOLD_LEAVE_STATUS.MEMBERS_LOAD_FAILED }
  | (HouseholdLeaveSelection & {
      errorMessage: NullableRef<string>;
      status: typeof HOUSEHOLD_LEAVE_STATUS.CONFIRMING;
    })
  | (HouseholdLeaveSelection & { status: typeof HOUSEHOLD_LEAVE_STATUS.LEAVING })
  | (HouseholdLeaveSelection & { status: typeof HOUSEHOLD_LEAVE_STATUS.FAILED });

interface UseHouseholdLeaveParams {
  /** Rol que muestra la pantalla: el admin carga los miembros al abrir. La base lo decide igual. */
  isAdmin: boolean;
  /** La base ya no tiene al usuario en la familia: left, household_deleted o not_member. */
  onLeft: (leaveResult: HouseholdLeaveResultType) => void;
}

interface UseHouseholdLeaveReturn {
  dialogCase: HouseholdLeaveDialogCaseType;
  errorMessage: NullableRef<string>;
  isConfirmDisabled: boolean;
  isDialogOpen: boolean;
  isLeaving: boolean;
  isLoadingMembers: boolean;
  /** Los miembros que pueden quedar como admin; vacío salvo que el admin tenga que elegir. */
  newAdminCandidates: HouseholdMember[];
  onLeaveCancel: () => void;
  onLeaveConfirm: () => void;
  onLeaveRequest: () => void;
  onNewAdminSelect: (userId: string) => void;
  selectedNewAdminId: NullableRef<string>;
  /** Hay qué confirmar: texto del caso y botón "Salir" (no mientras carga o si falló la carga). */
  showConfirm: boolean;
}

const IDLE_STATE: HouseholdLeaveState = { status: HOUSEHOLD_LEAVE_STATUS.IDLE };

const getDialogCase = (newAdminCandidates: NullableRef<HouseholdMember[]>): HouseholdLeaveDialogCaseType => {
  if (newAdminCandidates === null) return HOUSEHOLD_LEAVE_DIALOG_CASE.MEMBER;
  return newAdminCandidates.length === 0
    ? HOUSEHOLD_LEAVE_DIALOG_CASE.SOLE_ADMIN
    : HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER;
};

// Resultados con los que sigue en la familia: el diálogo vuelve a cargar los
// miembros con este aviso. null en los demás (ya no es parte de la familia).
// transfer_required también llega si alguien se unió mientras el admin estaba
// solo, o si a un miembro le pasaron el rol con el diálogo abierto: por eso
// se recargan los miembros aunque la pantalla no lo mostrara como admin.
const getReloadErrorMessage = (leaveResult: HouseholdLeaveResultType): NullableRef<string> => {
  if (leaveResult === HOUSEHOLD_LEAVE_RESULT.TRANSFER_REQUIRED) return HOUSEHOLD_LEAVE_TEXT.TRANSFER_REQUIRED;
  if (leaveResult === HOUSEHOLD_LEAVE_RESULT.INVALID_NEW_ADMIN) return HOUSEHOLD_LEAVE_TEXT.INVALID_NEW_ADMIN;
  return null;
};

const getErrorMessage = (state: HouseholdLeaveState): NullableRef<string> => {
  switch (state.status) {
    case HOUSEHOLD_LEAVE_STATUS.CONFIRMING:
    case HOUSEHOLD_LEAVE_STATUS.LOADING_MEMBERS:
      return state.errorMessage;
    case HOUSEHOLD_LEAVE_STATUS.FAILED:
      return HOUSEHOLD_LEAVE_TEXT.FAILED;
    case HOUSEHOLD_LEAVE_STATUS.MEMBERS_LOAD_FAILED:
      return HOUSEHOLD_LEAVE_TEXT.MEMBERS_LOAD_ERROR;
    default:
      return null;
  }
};

/**
 * Salir de la familia (SCRUM-58): abrir la confirmación, cargar los miembros
 * si sale el admin, elegir al nuevo admin y confirmar. Quién sale, con qué
 * rol y si el elegido es válido lo decide la base (leave_household); acá
 * solo se traduce el resultado. No conoce la pantalla: avisa con onLeft.
 */
export const useHouseholdLeave = ({ isAdmin, onLeft }: UseHouseholdLeaveParams): UseHouseholdLeaveReturn => {
  const [state, setState] = useState<HouseholdLeaveState>(IDLE_STATE);
  // Doble clic: dos clics en el mismo render ven el mismo estado, así que la
  // guarda es una ref (como isJoiningRef en useHouseholdInvitationViewModel).
  const isLeavingRef = useRef<boolean>(false);
  // Si la pantalla se cierra mientras sale, la respuesta se ignora.
  const isMountedRef = useRef<boolean>(true);

  const isLoadingMembers = state.status === HOUSEHOLD_LEAVE_STATUS.LOADING_MEMBERS;
  const selection: NullableRef<HouseholdLeaveSelection> =
    state.status === HOUSEHOLD_LEAVE_STATUS.CONFIRMING ||
    state.status === HOUSEHOLD_LEAVE_STATUS.LEAVING ||
    state.status === HOUSEHOLD_LEAVE_STATUS.FAILED
      ? state
      : null;
  const newAdminCandidates = selection?.newAdminCandidates ?? null;
  const selectedNewAdminId = selection?.selectedNewAdminId ?? null;
  const dialogCase = getDialogCase(newAdminCandidates);
  const isLeaving = state.status === HOUSEHOLD_LEAVE_STATUS.LEAVING;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isLoadingMembers) return undefined;

    // Si se cancela o la pantalla se cierra antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;

    getHouseholdMembers()
      .then((members) => {
        if (isCancelled) return;
        // Quien sale no puede elegirse a sí mismo.
        const loadedCandidates = members.filter((member) => !member.isCurrentUser);
        setState((currentState) =>
          currentState.status === HOUSEHOLD_LEAVE_STATUS.LOADING_MEMBERS
            ? {
                // El aviso pide elegir a alguien: sin nadie más en la familia
                // (todos salieron mientras tanto) ya no aplica.
                errorMessage: loadedCandidates.length > 0 ? currentState.errorMessage : null,
                newAdminCandidates: loadedCandidates,
                // La lista es nueva: la elección anterior pudo dejar de ser válida.
                selectedNewAdminId: null,
                status: HOUSEHOLD_LEAVE_STATUS.CONFIRMING,
              }
            : currentState,
        );
      })
      .catch(() => {
        if (!isCancelled) setState({ status: HOUSEHOLD_LEAVE_STATUS.MEMBERS_LOAD_FAILED });
      });

    return () => {
      isCancelled = true;
    };
  }, [isLoadingMembers]);

  // Abrir no modifica nada: solo "Salir" llama a la base (regla 10).
  const onLeaveRequest = (): void => {
    if (state.status !== HOUSEHOLD_LEAVE_STATUS.IDLE) return;

    setState(
      isAdmin
        ? { errorMessage: null, status: HOUSEHOLD_LEAVE_STATUS.LOADING_MEMBERS }
        : {
            errorMessage: null,
            newAdminCandidates: null,
            selectedNewAdminId: null,
            status: HOUSEHOLD_LEAVE_STATUS.CONFIRMING,
          },
    );
  };

  const onNewAdminSelect = (userId: string): void => {
    if (!selection || isLeaving) return;
    // Solo alguien de la lista que mandó la base; la base lo vuelve a validar.
    if (!selection.newAdminCandidates?.some((candidate) => candidate.userId === userId)) return;

    // Elegir de nuevo borra el aviso del intento anterior.
    setState({
      ...selection,
      errorMessage: null,
      selectedNewAdminId: userId,
      status: HOUSEHOLD_LEAVE_STATUS.CONFIRMING,
    });
  };

  const leave = async (leaveSelection: HouseholdLeaveSelection): Promise<void> => {
    setState({ ...leaveSelection, status: HOUSEHOLD_LEAVE_STATUS.LEAVING });

    try {
      // Sin elegido no viaja el parámetro: la base usa su default null.
      const leaveResult = await leaveHousehold(leaveSelection.selectedNewAdminId ?? undefined);
      if (!isMountedRef.current) return;

      const reloadErrorMessage = getReloadErrorMessage(leaveResult);
      if (reloadErrorMessage) {
        setState({ errorMessage: reloadErrorMessage, status: HOUSEHOLD_LEAVE_STATUS.LOADING_MEMBERS });
        return;
      }

      setState(IDLE_STATE);
      onLeft(leaveResult);
    } catch {
      // El diálogo sigue abierto con la misma elección: "Salir" reintenta. Si
      // la primera llamada sí llegó a la base, el reintento responde not_member.
      if (isMountedRef.current) setState({ ...leaveSelection, status: HOUSEHOLD_LEAVE_STATUS.FAILED });
    } finally {
      isLeavingRef.current = false;
    }
  };

  const onLeaveConfirm = (): void => {
    if (!selection || isLeaving || isLeavingRef.current) return;
    // Con otros miembros, sin elegir a nadie no se manda (la base respondería transfer_required).
    if (dialogCase === HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER && selection.selectedNewAdminId === null) return;

    isLeavingRef.current = true;
    void leave({
      newAdminCandidates: selection.newAdminCandidates,
      selectedNewAdminId: selection.selectedNewAdminId,
    });
  };

  const onLeaveCancel = (): void => {
    // Mientras sale no se cierra: la petición ya salió y su resultado se tiene que ver.
    if (isLeaving) return;
    setState(IDLE_STATE);
  };

  return {
    dialogCase,
    errorMessage: getErrorMessage(state),
    isConfirmDisabled:
      isLeaving || (dialogCase === HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER && selectedNewAdminId === null),
    isDialogOpen: state.status !== HOUSEHOLD_LEAVE_STATUS.IDLE,
    isLeaving,
    isLoadingMembers,
    newAdminCandidates: dialogCase === HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER ? (newAdminCandidates ?? []) : [],
    onLeaveCancel,
    onLeaveConfirm,
    onLeaveRequest,
    onNewAdminSelect,
    selectedNewAdminId,
    showConfirm: selection !== null,
  };
};

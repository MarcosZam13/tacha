import { useEffect, useRef, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_REMOVE_MEMBER_RESULT,
  HOUSEHOLD_REMOVE_MEMBER_STATUS,
  HOUSEHOLD_REMOVE_MEMBER_TEXT,
} from "../constants/household.constants";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import { removeHouseholdMember } from "../services/household.service";
import { toMemberLabel } from "../utils/toMemberLabel";

/** La persona elegida para eliminar: su id (solo para la base) y cómo se la nombra. */
interface RemovalTarget {
  /** El nombre, o "Miembro sin nombre". Nunca el correo. */
  memberLabel: string;
  userId: string;
}

/** Unión discriminada por `status` (specs/SPEC.md §6): el flujo está en uno solo de estos estados. */
type HouseholdRemovalState =
  | { status: typeof HOUSEHOLD_REMOVE_MEMBER_STATUS.IDLE }
  | (RemovalTarget & { status: typeof HOUSEHOLD_REMOVE_MEMBER_STATUS.CONFIRMING })
  | (RemovalTarget & { status: typeof HOUSEHOLD_REMOVE_MEMBER_STATUS.REMOVING })
  | (RemovalTarget & { status: typeof HOUSEHOLD_REMOVE_MEMBER_STATUS.FAILED });

interface UseHouseholdMemberRemovalParams {
  /**
   * La persona ya no está en la familia (`removed`, o `member_not_found`
   * porque salió o la eliminó otra pestaña): hay que recargar la lista.
   */
  onMembersChanged: () => void;
  /** Quien llama ya no es admin (`not_admin`): hay que volver a leer la membresía. */
  onAdminLost: () => void;
}

interface UseHouseholdMemberRemovalReturn {
  /** Error dentro del diálogo; "Eliminar" reintenta. */
  errorMessage: NullableRef<string>;
  isDialogOpen: boolean;
  /** Mientras espera a la base: botones deshabilitados y el diálogo no se cierra. */
  isRemoving: boolean;
  /** A quién se elimina; null con el diálogo cerrado. */
  memberLabel: NullableRef<string>;
  /** "Integrante eliminado correctamente" (zona role="status"); se borra al abrir otro diálogo. */
  noticeMessage: NullableRef<string>;
  onRemoveCancel: () => void;
  onRemoveConfirm: () => void;
  onRemoveRequest: (member: HouseholdMember) => void;
}

const IDLE_STATE: HouseholdRemovalState = { status: HOUSEHOLD_REMOVE_MEMBER_STATUS.IDLE };

/**
 * Eliminar a un integrante (SCRUM-61): abrir la confirmación para una persona,
 * cancelar o confirmar. Quién puede eliminar, a quién y en qué familia lo
 * decide la base (remove_household_member, migración 026); acá solo se
 * traduce el resultado (SPEC §7). No conoce la pantalla: avisa con
 * onMembersChanged y onAdminLost.
 */
export const useHouseholdMemberRemoval = ({
  onAdminLost,
  onMembersChanged,
}: UseHouseholdMemberRemovalParams): UseHouseholdMemberRemovalReturn => {
  const [state, setState] = useState<HouseholdRemovalState>(IDLE_STATE);
  const [noticeMessage, setNoticeMessage] = useState<NullableRef<string>>(null);
  // Doble clic: dos clics en el mismo render ven el mismo estado, así que la
  // guarda es una ref (como isLeavingRef en useHouseholdLeave).
  const isRemovingRef = useRef<boolean>(false);
  // Si la pantalla se cierra mientras elimina, la respuesta se ignora.
  const isMountedRef = useRef<boolean>(true);

  const isRemoving = state.status === HOUSEHOLD_REMOVE_MEMBER_STATUS.REMOVING;
  const target: NullableRef<RemovalTarget> = state.status === HOUSEHOLD_REMOVE_MEMBER_STATUS.IDLE ? null : state;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Abrir no modifica nada: solo "Eliminar" llama a la base (SPEC regla 8).
  const onRemoveRequest = (member: HouseholdMember): void => {
    if (state.status !== HOUSEHOLD_REMOVE_MEMBER_STATUS.IDLE) return;
    setNoticeMessage(null);
    setState({
      // La misma regla que la fila: un nombre de solo espacios es "Miembro sin nombre".
      memberLabel: toMemberLabel(member.displayName),
      status: HOUSEHOLD_REMOVE_MEMBER_STATUS.CONFIRMING,
      userId: member.userId,
    });
  };

  const remove = async (removalTarget: RemovalTarget): Promise<void> => {
    setState({ ...removalTarget, status: HOUSEHOLD_REMOVE_MEMBER_STATUS.REMOVING });

    try {
      const removeResult = await removeHouseholdMember(removalTarget.userId);
      if (!isMountedRef.current) return;

      switch (removeResult) {
        case HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED:
          setState(IDLE_STATE);
          setNoticeMessage(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS);
          onMembersChanged();
          break;
        // Ya no estaba (salió o la eliminó otra pestaña): se cierra y la lista
        // se recarga, sin mensaje (SPEC §7; D3 no define un texto).
        case HOUSEHOLD_REMOVE_MEMBER_RESULT.MEMBER_NOT_FOUND:
          setState(IDLE_STATE);
          onMembersChanged();
          break;
        // Ya no es admin (salió o pasó el rol en otra pestaña): se cierra y se
        // vuelve a leer la membresía para mostrar el estado real.
        case HOUSEHOLD_REMOVE_MEMBER_RESULT.NOT_ADMIN:
          setState(IDLE_STATE);
          onAdminLost();
          break;
        // No debería pasar (la fila propia no tiene el botón): se muestra como falla.
        case HOUSEHOLD_REMOVE_MEMBER_RESULT.CANNOT_REMOVE_SELF:
          setState({ ...removalTarget, status: HOUSEHOLD_REMOVE_MEMBER_STATUS.FAILED });
          break;
      }
    } catch {
      // El diálogo sigue abierto con la misma persona: "Eliminar" reintenta. Si
      // la primera llamada sí llegó a la base, el reintento responde
      // member_not_found y la lista se recarga.
      if (isMountedRef.current) setState({ ...removalTarget, status: HOUSEHOLD_REMOVE_MEMBER_STATUS.FAILED });
    } finally {
      isRemovingRef.current = false;
    }
  };

  const onRemoveConfirm = (): void => {
    if (!target || isRemoving || isRemovingRef.current) return;
    isRemovingRef.current = true;
    void remove({ memberLabel: target.memberLabel, userId: target.userId });
  };

  const onRemoveCancel = (): void => {
    // Mientras elimina no se cierra: la petición ya salió y su resultado se tiene que ver.
    if (isRemoving) return;
    setState(IDLE_STATE);
  };

  return {
    errorMessage: state.status === HOUSEHOLD_REMOVE_MEMBER_STATUS.FAILED ? HOUSEHOLD_REMOVE_MEMBER_TEXT.ERROR : null,
    isDialogOpen: target !== null,
    isRemoving,
    memberLabel: target?.memberLabel ?? null,
    noticeMessage,
    onRemoveCancel,
    onRemoveConfirm,
    onRemoveRequest,
  };
};

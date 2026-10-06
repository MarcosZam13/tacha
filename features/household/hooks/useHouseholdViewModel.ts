import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { NullableRef, NullableUndefined } from "@/types/nullable.types";
import type { HouseholdInviteLinkCardProps } from "../components/models/HouseholdInviteLinkCardProps.interface";
import {
  HOUSEHOLD_FORM_ERROR,
  HOUSEHOLD_FORM_LIMIT,
  HOUSEHOLD_ROLE,
  HOUSEHOLD_SCREEN_STATUS,
  HOUSEHOLD_TEXT,
} from "../constants/household.constants";
import { createHousehold, getHouseholdMembership, hasRegisteredSession } from "../services/household.service";
import { useHouseholdInvite } from "./useHouseholdInvite";

/** Unión discriminada por `status`: la pantalla está en uno solo de estos estados. */
type HouseholdScreenState =
  | { householdName: string; status: typeof HOUSEHOLD_SCREEN_STATUS.ADMIN }
  | { status: typeof HOUSEHOLD_SCREEN_STATUS.CREATING }
  | { status: typeof HOUSEHOLD_SCREEN_STATUS.LOAD_FAILED }
  | { status: typeof HOUSEHOLD_SCREEN_STATUS.LOADING }
  | { householdName: string; status: typeof HOUSEHOLD_SCREEN_STATUS.MEMBER }
  | { status: typeof HOUSEHOLD_SCREEN_STATUS.NO_ACCOUNT }
  | { status: typeof HOUSEHOLD_SCREEN_STATUS.NO_HOUSEHOLD };

/** La sección "Invitar a mi familia", con solo lo que dibuja la pantalla. */
interface HouseholdInviteSection {
  /** Props de la tarjeta ya armadas, o null si todavía no hay link. */
  card: NullableRef<HouseholdInviteLinkCardProps>;
  generateLabel: string;
  isGenerating: boolean;
  isLoading: boolean;
  onGenerate: () => void;
  /** Todavía no hay enlace: se muestra el botón "Generar enlace de invitación". */
  showInviteButton: boolean;
}

interface UseHouseholdViewModelReturn {
  /** Único aviso de error visible a la vez (role="alert" en la pantalla). */
  errorMessage: NullableRef<string>;
  /** Mensaje de confirmación (role="status", siempre montado en la pantalla). */
  feedbackMessage: NullableRef<string>;
  householdName: NullableRef<string>;
  invite: HouseholdInviteSection;
  isCreating: boolean;
  isLoading: boolean;
  name: string;
  nameError: NullableUndefined<string>;
  onCreateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onNameChange: (name: string) => void;
  showCreateForm: boolean;
  showInvite: boolean;
  showMemberNotice: boolean;
  showNoAccount: boolean;
}

// Qué pantalla le toca al usuario actual según su sesión y su membresía.
const loadHouseholdScreen = async (): Promise<HouseholdScreenState> => {
  if (!(await hasRegisteredSession())) return { status: HOUSEHOLD_SCREEN_STATUS.NO_ACCOUNT };

  const membership = await getHouseholdMembership();
  if (!membership) return { status: HOUSEHOLD_SCREEN_STATUS.NO_HOUSEHOLD };

  return membership.role === HOUSEHOLD_ROLE.ADMIN
    ? { householdName: membership.householdName, status: HOUSEHOLD_SCREEN_STATUS.ADMIN }
    : { householdName: membership.householdName, status: HOUSEHOLD_SCREEN_STATUS.MEMBER };
};

// Valida el nombre recortado: create_household aplica btrim antes de insertar,
// así que households_name_check (011) mide ese mismo nombre recortado. Acá es
// para avisar antes de mandar; la base es la garantía.
const validateHouseholdName = (name: string): NullableUndefined<string> => {
  const trimmedName = name.trim();
  if (trimmedName.length === 0) return HOUSEHOLD_FORM_ERROR.NAME_REQUIRED;
  if (trimmedName.length > HOUSEHOLD_FORM_LIMIT.NAME_MAX_LENGTH) return HOUSEHOLD_FORM_ERROR.NAME_TOO_LONG;
  return undefined;
};

// Un solo aviso de error a la vez: primero el de la pantalla, después el de
// crear el household y al final el de la sección del link.
const getScreenErrorMessage = (
  isLoadFailed: boolean,
  hasCreateFailed: boolean,
  inviteErrorMessage: NullableRef<string>,
): NullableRef<string> => {
  if (isLoadFailed) return HOUSEHOLD_TEXT.LOAD_ERROR;
  if (hasCreateFailed) return HOUSEHOLD_TEXT.CREATE_ERROR;
  return inviteErrorMessage;
};

/**
 * Facade de la pantalla "Mi familia": resuelve qué ve el usuario (sin
 * cuenta, sin household, miembro o admin), maneja el formulario para crear
 * el household y le pasa a useHouseholdInvite si es admin. Le entrega a
 * Household.tsx exactamente lo que dibuja.
 */
export const useHouseholdViewModel = (): UseHouseholdViewModelReturn => {
  // Arranca en "cargando": el efecto nunca hace un setState síncrono para empezar.
  const [state, setState] = useState<HouseholdScreenState>({ status: HOUSEHOLD_SCREEN_STATUS.LOADING });
  const [name, setName] = useState<string>("");
  const [nameError, setNameError] = useState<NullableUndefined<string>>(undefined);
  const [hasCreateFailed, setHasCreateFailed] = useState<boolean>(false);

  const householdInvite = useHouseholdInvite(state.status === HOUSEHOLD_SCREEN_STATUS.ADMIN);

  useEffect(() => {
    // Si la pantalla se cierra antes de que responda la base, la respuesta
    // se ignora en vez de actualizar un estado que ya no existe.
    let isCancelled = false;

    loadHouseholdScreen()
      .then((screenState) => {
        if (!isCancelled) setState(screenState);
      })
      .catch(() => {
        if (!isCancelled) setState({ status: HOUSEHOLD_SCREEN_STATUS.LOAD_FAILED });
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  // Al escribir se borran el error de validación y el de un intento anterior
  // de crear: los dos hablaban del nombre que había antes.
  const onNameChange = (nextName: string): void => {
    setName(nextName);
    setNameError(undefined);
    setHasCreateFailed(false);
  };

  const submitHousehold = async (): Promise<void> => {
    // Doble clic: mientras crea no se manda otra vez.
    if (state.status === HOUSEHOLD_SCREEN_STATUS.CREATING) return;

    // Un intento nuevo empieza sin el error del intento anterior.
    setHasCreateFailed(false);
    const validationError = validateHouseholdName(name);
    setNameError(validationError);
    if (validationError) return;

    setState({ status: HOUSEHOLD_SCREEN_STATUS.CREATING });

    try {
      await createHousehold(name.trim());
    } catch {
      setHasCreateFailed(true);
      setState({ status: HOUSEHOLD_SCREEN_STATUS.NO_HOUSEHOLD });
      return;
    }

    // Ya se creó: se vuelve a leer la membresía para mostrar lo que quedó en
    // la base (ahora es admin). Si solo falla esta lectura, no se ofrece crear
    // otra vez: el household ya existe.
    try {
      setState(await loadHouseholdScreen());
    } catch {
      setState({ status: HOUSEHOLD_SCREEN_STATUS.LOAD_FAILED });
    }
  };

  const onCreateSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    // submitHousehold maneja sus propios errores (los pasa al estado).
    void submitHousehold();
  };

  const isAdmin = state.status === HOUSEHOLD_SCREEN_STATUS.ADMIN;
  const inviteErrorMessage = isAdmin
    ? (householdInvite.loadErrorMessage ??
      householdInvite.generateErrorMessage ??
      householdInvite.copyErrorMessage)
    : null;

  return {
    errorMessage: getScreenErrorMessage(
      state.status === HOUSEHOLD_SCREEN_STATUS.LOAD_FAILED,
      hasCreateFailed,
      inviteErrorMessage,
    ),
    feedbackMessage: isAdmin ? householdInvite.feedbackMessage : null,
    householdName:
      state.status === HOUSEHOLD_SCREEN_STATUS.ADMIN || state.status === HOUSEHOLD_SCREEN_STATUS.MEMBER
        ? state.householdName
        : null,
    invite: {
      // La tarjeta recibe solo lo que dibuja: nada del servicio ni del hook.
      card:
        householdInvite.invite && householdInvite.expiryDateText
          ? {
              expiryDateText: householdInvite.expiryDateText,
              expiryLabel: householdInvite.expiryLabel,
              isExpired: householdInvite.isExpired,
              isGenerating: householdInvite.isGenerating,
              onCopy: householdInvite.handleCopy,
              onRegenerate: householdInvite.handleGenerate,
              regenerateLabel: householdInvite.generateLabel,
              statusLabel: householdInvite.statusLabel,
              url: householdInvite.invite.url,
            }
          : null,
      generateLabel: householdInvite.generateLabel,
      isGenerating: householdInvite.isGenerating,
      isLoading: householdInvite.isLoading,
      onGenerate: householdInvite.handleGenerate,
      showInviteButton: householdInvite.showInviteButton,
    },
    isCreating: state.status === HOUSEHOLD_SCREEN_STATUS.CREATING,
    isLoading: state.status === HOUSEHOLD_SCREEN_STATUS.LOADING,
    name,
    nameError,
    onCreateSubmit,
    onNameChange,
    showCreateForm:
      state.status === HOUSEHOLD_SCREEN_STATUS.NO_HOUSEHOLD || state.status === HOUSEHOLD_SCREEN_STATUS.CREATING,
    showInvite: isAdmin,
    showMemberNotice: state.status === HOUSEHOLD_SCREEN_STATUS.MEMBER,
    showNoAccount: state.status === HOUSEHOLD_SCREEN_STATUS.NO_ACCOUNT,
  };
};

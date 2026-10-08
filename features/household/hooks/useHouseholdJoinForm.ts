import { useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { NullableUndefined } from "@/types/nullable.types";
import type { HouseholdJoinFormProps } from "../components/models/HouseholdJoinFormProps.interface";
import { HOUSEHOLD_JOIN_FORM_ERROR, HOUSEHOLD_ROUTE } from "../constants/household.constants";
import { extractInviteToken } from "../utils/extractInviteToken";

/**
 * "Unirme con una invitación" en /household: guarda lo que se pegó, saca el
 * token y navega a /invitacion/<token>. No une a nadie: eso pasa solo en la
 * página de invitación, con el botón "Unirme".
 */
export const useHouseholdJoinForm = (): HouseholdJoinFormProps => {
  const router = useRouter();
  const [inviteText, setInviteText] = useState<string>("");
  const [inviteError, setInviteError] = useState<NullableUndefined<string>>(undefined);

  // Al escribir se borra el error: hablaba del texto anterior.
  const onInviteTextChange = (nextInviteText: string): void => {
    setInviteText(nextInviteText);
    setInviteError(undefined);
  };

  const onJoinSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();

    if (inviteText.trim().length === 0) {
      setInviteError(HOUSEHOLD_JOIN_FORM_ERROR.REQUIRED);
      return;
    }

    const inviteToken = extractInviteToken(inviteText);
    if (!inviteToken) {
      setInviteError(HOUSEHOLD_JOIN_FORM_ERROR.INVALID);
      return;
    }

    router.push(`${HOUSEHOLD_ROUTE.INVITATION}/${inviteToken}`);
  };

  return { inviteError, inviteText, onInviteTextChange, onJoinSubmit };
};

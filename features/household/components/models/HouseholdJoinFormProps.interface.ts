import type { FormEvent } from "react";
import type { NullableUndefined } from "@/types/nullable.types";

/** Lo que el formulario dibuja; el estado y la validación viven en useHouseholdJoinForm. */
export interface HouseholdJoinFormProps {
  /** Error del campo; undefined si no hay. */
  inviteError: NullableUndefined<string>;
  /** Lo que el usuario pegó (enlace completo o código). */
  inviteText: string;
  onInviteTextChange: (inviteText: string) => void;
  onJoinSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

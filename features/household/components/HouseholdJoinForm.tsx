import { Button, Input } from "@/components/ui";
import { HOUSEHOLD_JOIN_FORM_TEXT } from "../constants/household.constants";
import type { HouseholdJoinFormProps } from "./models/HouseholdJoinFormProps.interface";

/**
 * "Unirme con una invitación": un campo para pegar el enlace o el código.
 * Solo presentación, con la misma tarjeta que HouseholdCreateForm para que
 * las dos acciones se vean igual de importantes (DESIGN.md §7.15).
 */
export const HouseholdJoinForm = ({
  inviteError,
  inviteText,
  onInviteTextChange,
  onJoinSubmit,
}: HouseholdJoinFormProps): React.JSX.Element => (
  <section className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-xl font-semibold text-tacha-text">{HOUSEHOLD_JOIN_FORM_TEXT.TITLE}</h2>
      <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_JOIN_FORM_TEXT.DESCRIPTION}</p>
    </div>
    {/* noValidate: la validación la hace useHouseholdJoinForm. */}
    <form noValidate onSubmit={onJoinSubmit} className="flex flex-col gap-4">
      <Input
        label={HOUSEHOLD_JOIN_FORM_TEXT.INPUT_LABEL}
        value={inviteText}
        onChange={onInviteTextChange}
        errorMessage={inviteError}
        isRequired
      />
      <div>
        <Button type="submit">{HOUSEHOLD_JOIN_FORM_TEXT.SUBMIT}</Button>
      </div>
    </form>
  </section>
);

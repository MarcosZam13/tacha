import { Button, Input } from "@/components/ui";
import { HOUSEHOLD_TEXT } from "../constants/household.constants";
import type { HouseholdCreateFormProps } from "./models/HouseholdCreateFormProps.interface";

/**
 * Crear el household: solo el nombre. Solo presentación; el botón se
 * deshabilita mientras crea para que un doble clic no mande dos veces.
 */
export const HouseholdCreateForm = ({
  isCreating,
  name,
  nameError,
  onNameChange,
  onSubmit,
}: HouseholdCreateFormProps): React.JSX.Element => (
  <section className="flex flex-col gap-4 rounded-tacha-card border border-tacha-border bg-tacha-surface p-6">
    <div className="flex flex-col gap-1">
      <h2 className="font-display text-xl font-semibold text-tacha-text">{HOUSEHOLD_TEXT.CREATE_TITLE}</h2>
      <p className="font-body text-sm text-tacha-textsec">{HOUSEHOLD_TEXT.CREATE_DESCRIPTION}</p>
    </div>
    {/* noValidate: la validación la hace el ViewModel, con las mismas reglas que la base. */}
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label={HOUSEHOLD_TEXT.NAME_LABEL}
        value={name}
        onChange={onNameChange}
        placeholder={HOUSEHOLD_TEXT.NAME_PLACEHOLDER}
        errorMessage={nameError}
        isRequired
      />
      <div>
        <Button type="submit" isDisabled={isCreating}>
          {isCreating ? HOUSEHOLD_TEXT.CREATING : HOUSEHOLD_TEXT.CREATE}
        </Button>
      </div>
    </form>
  </section>
);

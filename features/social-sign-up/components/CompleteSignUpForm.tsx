import { Button, Input } from "@/components/ui";
import { COMPLETE_SIGN_UP_LABEL } from "../constants/complete-sign-up.constants";
import type { CompleteSignUpFormProps } from "./models/CompleteSignUpFormProps.interface";

/** El formulario de /registro/completar: solo presenta lo que decide useCompleteSignUpViewModel. */
export const CompleteSignUpForm = ({
  isSubmitDisabled,
  name,
  nameError,
  onNameChange,
  onSubmit,
  saveError,
  submitLabel,
}: CompleteSignUpFormProps): React.JSX.Element => (
  <>
    <div className="flex flex-col gap-2">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{COMPLETE_SIGN_UP_LABEL.TITLE}</h1>
      <p className="font-body text-sm text-tacha-textsec">{COMPLETE_SIGN_UP_LABEL.DESCRIPTION}</p>
    </div>

    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        isRequired
        label={COMPLETE_SIGN_UP_LABEL.NAME}
        value={name}
        onChange={onNameChange}
        errorMessage={nameError}
      />

      {saveError ? (
        <p role="alert" className="font-body text-sm text-tacha-danger">
          {saveError}
        </p>
      ) : null}

      <Button type="submit" isDisabled={isSubmitDisabled}>
        {submitLabel}
      </Button>
    </form>
  </>
);

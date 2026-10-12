import { FocusedHeading } from "@/components/focused-heading/FocusedHeading";
import { PasswordInput } from "@/components/password-input/PasswordInput";
import { PasswordStrengthMeter } from "@/components/password-strength-meter/PasswordStrengthMeter";
import { Button } from "@/components/ui";
import {
  AUTOCOMPLETE,
  BUTTON_VARIANT,
  NEW_PASSWORD_FIELD,
  NEW_PASSWORD_LABEL,
} from "@/constants";
import { CHANGE_PASSWORD_LABEL } from "../constants/login.constants";
import type { ChangePasswordFormProps } from "./models/ChangePasswordFormProps.interface";

/** Formulario de nueva contraseña: nueva + repetir, con el medidor de fortaleza bajo la nueva. */
export const ChangePasswordForm = ({
  confirmPasswordError,
  handleBackToNotice,
  handleChange,
  handleSubmit,
  isSaveDisabled,
  isSaving,
  passwordStrength,
  submitError,
  values,
}: ChangePasswordFormProps): React.JSX.Element => (
  <section className="flex flex-col gap-4">
    <FocusedHeading>{CHANGE_PASSWORD_LABEL.FORM_TITLE}</FocusedHeading>

    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <PasswordInput
          autoComplete={AUTOCOMPLETE.NEW_PASSWORD}
          isRequired
          label={NEW_PASSWORD_LABEL.NEW_PASSWORD}
          value={values.newPassword}
          onChange={handleChange(NEW_PASSWORD_FIELD.NEW_PASSWORD)}
          errorMessage={undefined}
        />
        {passwordStrength ? <PasswordStrengthMeter strength={passwordStrength} /> : null}
      </div>

      <PasswordInput
        autoComplete={AUTOCOMPLETE.NEW_PASSWORD}
        isRequired
        label={NEW_PASSWORD_LABEL.CONFIRM_PASSWORD}
        value={values.confirmPassword}
        onChange={handleChange(NEW_PASSWORD_FIELD.CONFIRM_PASSWORD)}
        errorMessage={confirmPasswordError}
      />

      {submitError ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" isDisabled={isSaveDisabled}>
        {isSaving ? NEW_PASSWORD_LABEL.SAVING : NEW_PASSWORD_LABEL.SAVE}
      </Button>
      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={handleBackToNotice}>
        {CHANGE_PASSWORD_LABEL.BACK}
      </Button>
    </form>
  </section>
);

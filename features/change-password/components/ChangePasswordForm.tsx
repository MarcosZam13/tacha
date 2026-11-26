import { PasswordInput } from "@/components/password-input/PasswordInput";
import { PasswordStrengthMeter } from "@/components/password-strength-meter/PasswordStrengthMeter";
import { Button } from "@/components/ui";
import { AUTOCOMPLETE, NEW_PASSWORD_FIELD, NEW_PASSWORD_LABEL } from "@/constants";
import { CHANGE_PASSWORD_FIELD, CHANGE_PASSWORD_TEXT } from "../constants/change-password.constants";
import { ChangePasswordFeedback } from "./ChangePasswordFeedback";
import type { ChangePasswordFormProps } from "./models/ChangePasswordFormProps.interface";

/**
 * Formulario de cambio de contraseña: la actual, la nueva (con el medidor) y repetir la nueva, cada una con
 * el ojo. Solo presentación; la lógica vive en el ViewModel.
 */
export const ChangePasswordForm = ({
  confirmPasswordError,
  currentPasswordError,
  handleChange,
  handleSubmit,
  isSaveDisabled,
  isSaving,
  newPasswordError,
  passwordStrength,
  status,
  submitError,
  values,
}: ChangePasswordFormProps): React.JSX.Element => (
  <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
    <PasswordInput
      autoComplete={AUTOCOMPLETE.CURRENT_PASSWORD}
      isRequired
      label={CHANGE_PASSWORD_TEXT.CURRENT_PASSWORD_LABEL}
      value={values.currentPassword}
      onChange={handleChange(CHANGE_PASSWORD_FIELD.CURRENT_PASSWORD)}
      errorMessage={currentPasswordError}
    />

    <div className="flex flex-col gap-2">
      <PasswordInput
        autoComplete={AUTOCOMPLETE.NEW_PASSWORD}
        isRequired
        label={NEW_PASSWORD_LABEL.NEW_PASSWORD}
        value={values.newPassword}
        onChange={handleChange(NEW_PASSWORD_FIELD.NEW_PASSWORD)}
        errorMessage={newPasswordError}
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

    <div className="flex flex-wrap items-center gap-4">
      <Button type="submit" isDisabled={isSaveDisabled}>
        {isSaving ? NEW_PASSWORD_LABEL.SAVING : NEW_PASSWORD_LABEL.SAVE}
      </Button>
      <ChangePasswordFeedback status={status} submitError={submitError} />
    </div>
  </form>
);

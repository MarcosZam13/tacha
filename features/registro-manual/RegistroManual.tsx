"use client";

import { PasswordStrengthMeter } from "@/components/password-strength-meter/PasswordStrengthMeter";
import { Button, Checkbox, Input, Modal } from "@/components/ui";
import {
  REGISTRO_FIELD,
  REGISTRO_FORM_FIELDS,
  REGISTRO_LABEL,
  TERMS_CONTENT_PLACEHOLDER,
  TERMS_LABEL,
} from "./constants/registro.constants";
import { useRegistroManualViewModel } from "./hooks/useRegistroManualViewModel";
import { VerificacionPendiente } from "./components/VerificacionPendiente";

/**
 * Pantalla de registro manual. "use client" porque usa hooks y habla con
 * Supabase desde el navegador.
 */
export const RegistroManual = (): React.JSX.Element => {
  const {
    errors,
    handleAcceptedTermsChange,
    handleChange,
    handleSubmit,
    handleTermsModalClose,
    handleTermsModalOpen,
    isAcceptedTerms,
    isSubmitDisabled,
    isSubmitting,
    isSuccess,
    isTermsModalOpen,
    passwordStrength,
    registeredEmail,
    submitError,
    values,
  } = useRegistroManualViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{REGISTRO_LABEL.TITLE}</h1>

        {isSuccess ? (
        <VerificacionPendiente email={registeredEmail} />
      ) : (
        <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
          {REGISTRO_FORM_FIELDS.map(({ field, label, type }) => (
            <div key={field} className="flex flex-col gap-2">
              <Input
                isRequired
                label={label}
                type={type}
                value={values[field]}
                onChange={handleChange(field)}
                errorMessage={errors[field]}
              />

              {field === REGISTRO_FIELD.PASSWORD && passwordStrength ? (
                <PasswordStrengthMeter strength={passwordStrength} />
              ) : null}
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Checkbox
              isChecked={isAcceptedTerms}
              onChange={handleAcceptedTermsChange}
              label={TERMS_LABEL.CHECKBOX}
            />
            <button
              type="button"
              onClick={handleTermsModalOpen}
              className="font-body text-sm text-tacha-teal underline"
            >
              {TERMS_LABEL.VIEW_LINK}
            </button>
          </div>

          {submitError ? (
            <p role="alert" className="font-body text-sm text-red-600">
              {submitError}
            </p>
          ) : null}

          <Button type="submit" isDisabled={isSubmitDisabled}>
            {isSubmitting ? REGISTRO_LABEL.SUBMITTING : REGISTRO_LABEL.SUBMIT}
          </Button>
        </form>
      )}

      <Modal isOpen={isTermsModalOpen} onClose={handleTermsModalClose} title={TERMS_LABEL.MODAL_TITLE}>
        <p className="font-body text-sm text-tacha-text">{TERMS_CONTENT_PLACEHOLDER}</p>
      </Modal>
    </main>
  );
};
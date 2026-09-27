"use client";

import { Button, Input } from "@/components/ui";
import { PasswordStrengthMeter } from "./components/PasswordStrengthMeter";
import {
  REGISTRO_FIELD,
  REGISTRO_FORM_FIELDS,
  REGISTRO_LABEL,
} from "./constants/registro.constants";
import { useRegistroManualViewModel } from "./hooks/useRegistroManualViewModel";

/**
 * Pantalla de registro manual. "use client" porque usa hooks y habla con
 * Supabase desde el navegador.
 */
export const RegistroManual = (): React.JSX.Element => {
  const {
    errors,
    handleChange,
    handleSubmit,
    isSubmitDisabled,
    isSubmitting,
    isSuccess,
    passwordStrength,
    submitError,
    values,
  } = useRegistroManualViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{REGISTRO_LABEL.TITLE}</h1>

      {isSuccess ? (
        <p role="status" className="font-body text-sm text-tacha-teal">
          {REGISTRO_LABEL.SUCCESS}
        </p>
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
    </main>
  );
};
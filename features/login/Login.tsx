"use client";

import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { RecaptchaWidget } from "./components/RecaptchaWidget";
import { LOGIN_FORM_FIELDS, LOGIN_LABEL, LOGIN_ROUTE, INPUT_TYPE } from "./constants/login.constants";
import { useLoginViewModel } from "./hooks/useLoginViewModel";
import { PasswordInput } from "./components/PasswordInput";

/**
 * Pantalla de inicio de sesión. "use client" porque usa hooks y habla con Supabase desde el navegador.
 */
export const Login = (): React.JSX.Element => {
  const {
    captchaResetCount,
    errors,
    handleCaptchaTokenChange,
    handleChange,
    handleSubmit,
    isSubmitDisabled,
    isSubmitting,
    submitError,
    values,
  } = useLoginViewModel();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 bg-tacha-bg px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{LOGIN_LABEL.TITLE}</h1>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
        {LOGIN_FORM_FIELDS.map(({ field, label, type }) =>
          type === INPUT_TYPE.PASSWORD ? (
            <PasswordInput
              key={field}
              isRequired
              label={label}
              value={values[field]}
              onChange={handleChange(field)}
              errorMessage={errors[field]}
            />
          ) : (
              <Input
                key={field}
                isRequired
                label={label}
                type={type}
                value={values[field]}
                onChange={handleChange(field)}
                errorMessage={errors[field]}
              />
            ),
          )}

        <RecaptchaWidget onTokenChange={handleCaptchaTokenChange} resetCount={captchaResetCount} />

        {submitError ? (
          <p role="alert" className="font-body text-sm text-red-600">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" isDisabled={isSubmitDisabled}>
          {isSubmitting ? LOGIN_LABEL.SUBMITTING : LOGIN_LABEL.SUBMIT}
        </Button>
      </form>

      <p className="font-body text-sm text-tacha-textsec">
        {LOGIN_LABEL.NO_ACCOUNT}{" "}
        <Link href={LOGIN_ROUTE.REGISTER} className="text-tacha-teal underline">
          {LOGIN_LABEL.REGISTER_LINK}
        </Link>
      </p>
    </main>
  );
};
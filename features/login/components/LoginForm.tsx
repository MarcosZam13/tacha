import Link from "next/link";
import { Button, Input } from "@/components/ui";
import {
  AUTOCOMPLETE,
  INPUT_TYPE,
  LOGIN_FORM_FIELDS,
  LOGIN_LABEL,
  LOGIN_ROUTE,
} from "../constants/login.constants";
import { InactivityNotice } from "./InactivityNotice";
import { PasswordInput } from "./PasswordInput";
import { RecaptchaWidget } from "./RecaptchaWidget";
import type { LoginFormProps } from "./models/LoginFormProps.interface";

/** Formulario de inicio de sesión: correo, contraseña, reCAPTCHA y enlace al registro. */
export const LoginForm = ({
  captchaResetCount,
  errors,
  handleCaptchaTokenChange,
  handleChange,
  handleSubmit,
  isSubmitDisabled,
  isSubmitting,
  submitError,
  values,
}: LoginFormProps): React.JSX.Element => (
  <>
    <InactivityNotice />

    <h1 className="font-display text-3xl font-bold text-tacha-text">{LOGIN_LABEL.TITLE}</h1>

    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {LOGIN_FORM_FIELDS.map(({ field, label, type }) =>
        type === INPUT_TYPE.PASSWORD ? (
          <PasswordInput
            key={field}
            autoComplete={AUTOCOMPLETE.CURRENT_PASSWORD}
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
  </>
);

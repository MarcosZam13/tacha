import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { AUTH_ROUTE } from "@/constants";
import {
  FORGOT_PASSWORD_INPUT_TYPE,
  FORGOT_PASSWORD_LABEL,
} from "../constants/password-recovery.constants";
import type { ForgotPasswordFormProps } from "./models/ForgotPasswordFormProps.interface";

/** Formulario para pedir el enlace: título, explicación, correo, botón y enlace de vuelta al login. */
export const ForgotPasswordForm = ({
  email,
  emailError,
  handleChange,
  handleSubmit,
  isSubmitDisabled,
  isSubmitting,
  submitError,
}: ForgotPasswordFormProps): React.JSX.Element => (
  <>
    <h1 className="font-display text-3xl font-bold text-tacha-text">
      {FORGOT_PASSWORD_LABEL.TITLE}
    </h1>
    <p className="font-body text-sm text-tacha-textsec">{FORGOT_PASSWORD_LABEL.DESCRIPTION}</p>

    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        isRequired
        label={FORGOT_PASSWORD_LABEL.EMAIL}
        type={FORGOT_PASSWORD_INPUT_TYPE}
        value={email}
        onChange={handleChange}
        errorMessage={emailError}
      />

      {submitError ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" isDisabled={isSubmitDisabled}>
        {isSubmitting ? FORGOT_PASSWORD_LABEL.SUBMITTING : FORGOT_PASSWORD_LABEL.SUBMIT}
      </Button>
    </form>

    <Link href={AUTH_ROUTE.LOGIN} className="font-body text-sm text-tacha-teal underline">
      {FORGOT_PASSWORD_LABEL.BACK_TO_LOGIN}
    </Link>
  </>
);

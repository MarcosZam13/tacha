import Link from "next/link";
import { Button, Checkbox, Input } from "@/components/ui";
import { TERMS_ACCEPTANCE_LABEL, TERMS_ROUTE } from "@/constants";
import { COMPLETE_SIGN_UP_LABEL } from "../constants/complete-sign-up.constants";
import type { CompleteSignUpFormProps } from "./models/CompleteSignUpFormProps.interface";

/** El formulario de /registro/completar: solo presenta lo que decide useCompleteSignUpViewModel. */
export const CompleteSignUpForm = ({
  isSubmitDisabled,
  isTermsAccepted,
  name,
  nameError,
  onNameChange,
  onSubmit,
  onTermsAcceptedChange,
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

      {/* Los mismos textos que el registro manual (SCRUM-41). El texto completo es /terminos, en la misma
          pestaña: así su botón "Volver" regresa a este formulario (SCRUM-44). */}
      <div className="flex flex-wrap items-center gap-2">
        <Checkbox isChecked={isTermsAccepted} onChange={onTermsAcceptedChange} label={TERMS_ACCEPTANCE_LABEL.CHECKBOX} />
        <Link href={TERMS_ROUTE} className="font-body text-sm text-tacha-teal underline">
          {TERMS_ACCEPTANCE_LABEL.VIEW_LINK}
        </Link>
      </div>

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

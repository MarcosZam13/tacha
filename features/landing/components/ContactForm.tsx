import { RecaptchaWidget } from "@/components/recaptcha-widget/RecaptchaWidget";
import { Button, Input } from "@/components/ui";
import { CONTACT_FIELD, CONTACT_INPUT_FIELDS, CONTACT_LABEL } from "../constants/contact.constants";
import { ContactMessageField } from "./ContactMessageField";
import type { ContactFormProps } from "./models/ContactFormProps.type";

/** Formulario de contacto: nombre, correo, mensaje, reCAPTCHA y botón de envío. Solo presentación. */
export const ContactForm = ({
  captchaError,
  captchaResetCount,
  errors,
  handleCaptchaTokenChange,
  handleChange,
  handleSubmit,
  isSubmitting,
  submitError,
  values,
}: ContactFormProps): React.JSX.Element => (
  <>
    <p className="font-body text-base text-tacha-textsec">{CONTACT_LABEL.DESCRIPTION}</p>

    <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-4">
      {CONTACT_INPUT_FIELDS.map(({ field, label, type }) => (
        <Input
          key={field}
          isRequired
          label={label}
          type={type}
          value={values[field]}
          onChange={handleChange(field)}
          errorMessage={errors[field]}
        />
      ))}

      <ContactMessageField
        label={CONTACT_LABEL.MESSAGE}
        value={values.message}
        onChange={handleChange(CONTACT_FIELD.MESSAGE)}
        errorMessage={errors[CONTACT_FIELD.MESSAGE]}
      />

      <div className="flex flex-col gap-2">
        <RecaptchaWidget
          onTokenChange={handleCaptchaTokenChange}
          resetCount={captchaResetCount}
        />
        {captchaError ? (
          <p role="alert" className="font-body text-sm text-red-600">
            {captchaError}
          </p>
        ) : null}
      </div>

      {submitError ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {submitError}
        </p>
      ) : null}

      <Button type="submit" isDisabled={isSubmitting}>
        {isSubmitting ? CONTACT_LABEL.SUBMITTING : CONTACT_LABEL.SUBMIT}
      </Button>
    </form>
  </>
);

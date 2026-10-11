import Link from "next/link";
import { Button } from "@/components/ui";
import { AUTH_ROUTE, BUTTON_VARIANT } from "@/constants";
import { FORGOT_PASSWORD_LABEL } from "../constants/password-recovery.constants";
import { useFocusHeadingOnMount } from "../hooks/useFocusHeadingOnMount";
import type { ForgotPasswordSentProps } from "./models/ForgotPasswordSentProps.interface";

/**
 * Confirmación de que se pidió el enlace. El texto es el mismo exista o no la cuenta: esta pantalla
 * nunca debe decir lo contrario. El foco pasa al título (el botón que lo tenía ya no existe) y el
 * mensaje es role="status" para que un lector de pantalla lo anuncie.
 */
export const ForgotPasswordSent = ({
  onUseAnotherEmail,
}: ForgotPasswordSentProps): React.JSX.Element => {
  const headingRef = useFocusHeadingOnMount();

  return (
    <section className="flex flex-col gap-4">
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="font-display text-3xl font-bold text-tacha-text outline-none"
      >
        {FORGOT_PASSWORD_LABEL.TITLE}
      </h1>
      <p role="status" className="font-body text-sm text-tacha-textsec">
        {FORGOT_PASSWORD_LABEL.SENT_MESSAGE}
      </p>

      <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onUseAnotherEmail}>
        {FORGOT_PASSWORD_LABEL.USE_ANOTHER_EMAIL}
      </Button>

      <Link href={AUTH_ROUTE.LOGIN} className="font-body text-sm text-tacha-teal underline">
        {FORGOT_PASSWORD_LABEL.BACK_TO_LOGIN}
      </Link>
    </section>
  );
};

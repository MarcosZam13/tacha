import { FocusedHeading } from "@/components/focused-heading/FocusedHeading";
import { Button } from "@/components/ui";
import { RESET_PASSWORD_LABEL } from "../constants/password-recovery.constants";
import type { ResetPasswordDoneProps } from "./models/ResetPasswordDoneProps.interface";

/**
 * Confirmación tras guardar la nueva contraseña. Al rato se va al login solo; el botón permite ir sin
 * esperar, porque una redirección solo con temporizador no deja leer a quien necesita más tiempo.
 */
export const ResetPasswordDone = ({ onGoToLogin }: ResetPasswordDoneProps): React.JSX.Element => (
  <section className="flex flex-col gap-4">
    <FocusedHeading>{RESET_PASSWORD_LABEL.DONE_TITLE}</FocusedHeading>
    <p role="status" className="font-body text-sm text-tacha-textsec">
      {RESET_PASSWORD_LABEL.DONE_MESSAGE}
    </p>

    <Button onClick={onGoToLogin}>{RESET_PASSWORD_LABEL.GO_TO_LOGIN}</Button>
  </section>
);

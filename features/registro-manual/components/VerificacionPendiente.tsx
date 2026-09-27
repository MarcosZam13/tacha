import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { VERIFICATION_LABEL } from "../constants/registro.constants";
import { useVerificacionPendienteViewModel } from "../hooks/useVerificacionPendienteViewModel";
import type { VerificacionPendienteProps } from "./models/VerificacionPendienteProps.interface";

export const VerificacionPendiente = ({ email }: VerificacionPendienteProps): React.JSX.Element => {
  const { feedbackMessage, handleResend, isResendDisabled, resendLabel } =
    useVerificacionPendienteViewModel({ email });

  return (
    <section className="flex flex-col gap-4 font-body">
      <h2 className="font-display text-2xl font-bold text-tacha-text">
        {VERIFICATION_LABEL.PENDING_TITLE}
      </h2>

      <p className="text-sm text-tacha-text">
        {VERIFICATION_LABEL.PENDING_MESSAGE_PREFIX} <strong>{email}</strong>.{" "}
        {VERIFICATION_LABEL.PENDING_MESSAGE_SUFFIX}
      </p>

      <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isResendDisabled} onClick={handleResend}>
        {resendLabel}
      </Button>

      {feedbackMessage ? (
        <p role="status" className="text-sm text-tacha-textsec">
          {feedbackMessage}
        </p>
      ) : null}
    </section>
  );
};
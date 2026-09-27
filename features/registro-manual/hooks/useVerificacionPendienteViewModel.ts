import { useEffect, useState } from "react";
import { resendVerificationEmail } from "../services/registro.service";
import type { NullableUndefined } from "@/types/nullable.types";
import {
  RESEND_MESSAGE,
  RESEND_RESULT,
  VERIFICATION_COUNTDOWN_TICK_MS,
  VERIFICATION_LABEL,
  VERIFICATION_RESEND_COOLDOWN_SECONDS,
} from "../constants/registro.constants";
import type { ResendResultType } from "../constants/registro.constants";
import type { VerificacionPendienteViewModel } from "../models/VerificacionPendienteViewModel.interface";

export const useVerificacionPendienteViewModel = ({
  email,
}: {
  email: string;
}): VerificacionPendienteViewModel => {
  // Arranca con la espera completa: el correo se acaba de enviar al registrarse.
  const [secondsLeft, setSecondsLeft] = useState<number>(VERIFICATION_RESEND_COOLDOWN_SECONDS);
  const [isResending, setIsResending] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<NullableUndefined<string>>(undefined);

  // Cada segundo baja el contador; al llegar a 0 no programa nada más.
  useEffect(() => {
    const timer =
      secondsLeft > 0
        ? setTimeout(() => setSecondsLeft((previous) => previous - 1), VERIFICATION_COUNTDOWN_TICK_MS)
        : undefined;

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const handleResend = async (): Promise<void> => {
    setIsResending(true);
    setFeedbackMessage(undefined);

    const result = await resendVerificationEmail(email).catch(
      (): ResendResultType => RESEND_RESULT.ERROR,
    );

    setFeedbackMessage(RESEND_MESSAGE[result]);
    // Solo un fallo genérico permite reintentar de inmediato; el éxito y el 429 piden esperar.
    setSecondsLeft(result === RESEND_RESULT.ERROR ? 0 : VERIFICATION_RESEND_COOLDOWN_SECONDS);
    setIsResending(false);
  };

  const resendLabel = isResending
    ? VERIFICATION_LABEL.RESENDING
    : secondsLeft > 0
      ? `${VERIFICATION_LABEL.RESEND_WAIT} ${secondsLeft} ${VERIFICATION_LABEL.SECONDS_UNIT}`
      : VERIFICATION_LABEL.RESEND;

  return {
    feedbackMessage,
    handleResend,
    isResendDisabled: isResending || secondsLeft > 0,
    resendLabel,
  };
};
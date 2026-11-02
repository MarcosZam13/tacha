import { CHANGE_PASSWORD_STATUS, CHANGE_PASSWORD_TEXT } from "../constants/change-password.constants";
import type { ChangePasswordFeedbackProps } from "./models/ChangePasswordFeedbackProps.interface";

/**
 * Resultado del guardado. La confirmación es una región de estado (se anuncia sin mover el foco); el fallo
 * general, una alerta. Sin resultado no dibuja nada.
 */
export const ChangePasswordFeedback = ({
  status,
  submitError,
}: ChangePasswordFeedbackProps): React.JSX.Element | null => {
  if (status === CHANGE_PASSWORD_STATUS.SAVED) {
    return (
      <p role="status" className="font-body text-sm font-semibold text-tacha-teal">
        {CHANGE_PASSWORD_TEXT.SUCCESS}
      </p>
    );
  }

  return submitError ? (
    <p role="alert" className="font-body text-sm text-red-600">
      {submitError}
    </p>
  ) : null;
};

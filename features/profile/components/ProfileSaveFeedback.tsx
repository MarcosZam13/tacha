import { PROFILE_SAVE_STATUS, PROFILE_SUCCESS_MESSAGE } from "../constants/profile.constants";
import type { ProfileSaveFeedbackProps } from "./models/ProfileSaveFeedbackProps.interface";

/**
 * Resultado del guardado. La confirmación es una región de estado (se anuncia sin mover el foco); el error,
 * una alerta. Sin resultado no dibuja nada.
 */
export const ProfileSaveFeedback = ({
  saveError,
  saveStatus,
}: ProfileSaveFeedbackProps): React.JSX.Element | null => {
  if (saveStatus === PROFILE_SAVE_STATUS.SAVED) {
    return (
      <p role="status" className="font-body text-sm font-semibold text-tacha-teal">
        {PROFILE_SUCCESS_MESSAGE}
      </p>
    );
  }

  return saveStatus === PROFILE_SAVE_STATUS.ERROR && saveError ? (
    <p role="alert" className="font-body text-sm text-red-600">
      {saveError}
    </p>
  ) : null;
};

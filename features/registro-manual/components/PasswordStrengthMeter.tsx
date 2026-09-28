import {
  PASSWORD_REQUIREMENT_MESSAGE,
  PASSWORD_STRENGTH_LABEL,
  PASSWORD_STRENGTH_LEVEL,
  REGISTRO_LABEL,
} from "../constants/registro.constants";
import type { PasswordStrengthLevelType } from "../constants/registro.constants";
import type { PasswordStrengthMeterProps } from "./models/PasswordStrengthMeterProps.interface";

const LEVEL_BAR_CLASS_NAME: Record<PasswordStrengthLevelType, string> = {
  [PASSWORD_STRENGTH_LEVEL.MEDIUM]: "bg-tacha-terracotta",
  [PASSWORD_STRENGTH_LEVEL.STRONG]: "bg-tacha-teal",
  [PASSWORD_STRENGTH_LEVEL.WEAK]: "bg-red-600",
};

/**
 * Barra de fortaleza: un segmento por regla, pintados los que la contraseña ya cumple.
 * El nivel también va escrito y en aria-valuetext: el color solo no alcanza para todos.
 */
export const PasswordStrengthMeter = ({
  strength,
}: PasswordStrengthMeterProps): React.JSX.Element => {
  const { level, metCount, missingRules, totalRules } = strength;
  const levelLabel = PASSWORD_STRENGTH_LABEL[level];
  const segments = Array.from({ length: totalRules }, (_, index) => index);

  return (
    <div className="flex flex-col gap-2 font-body text-sm">
      <div
        role="progressbar"
        aria-label={REGISTRO_LABEL.PASSWORD_STRENGTH}
        aria-valuemin={0}
        aria-valuemax={totalRules}
        aria-valuenow={metCount}
        aria-valuetext={levelLabel}
        className="flex gap-1"
      >
        {segments.map((segment) => (
          <span
            key={segment}
            className={`h-1.5 flex-1 rounded-full ${
              segment < metCount ? LEVEL_BAR_CLASS_NAME[level] : "bg-tacha-border"
            }`}
          />
        ))}
      </div>

      <p aria-live="polite" className="font-medium text-tacha-text">
        {REGISTRO_LABEL.PASSWORD_STRENGTH}: {levelLabel}
      </p>

      {missingRules.length > 0 ? (
        <ul className="flex flex-col gap-1 text-tacha-textsec">
          {missingRules.map((rule) => (
            <li key={rule}>{PASSWORD_REQUIREMENT_MESSAGE[rule]}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};
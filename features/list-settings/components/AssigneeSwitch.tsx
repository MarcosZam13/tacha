import { LIST_SETTINGS_TEXT } from "../constants/list-settings.constants";
import type { AssigneeSwitchProps } from "./models/AssigneeSwitchProps.interface";

/**
 * El interruptor "Encargado" de una lista (SPEC §9): un `<button role="switch">`, táctil (mínimo 44 px) y que no
 * depende del color: dice "Activado" o "Desactivado" con texto.
 */
export const AssigneeSwitch = ({ isChecked, isDisabled, label, onToggle }: AssigneeSwitchProps): React.JSX.Element => (
  <button
    type="button"
    role="switch"
    aria-checked={isChecked}
    aria-label={label}
    disabled={isDisabled}
    onClick={onToggle}
    className="flex min-h-11 items-center gap-3 font-body text-sm text-tacha-text disabled:cursor-not-allowed disabled:opacity-50"
  >
    <span
      aria-hidden="true"
      className={`relative h-6 w-11 rounded-full transition-colors ${isChecked ? "bg-tacha-teal" : "bg-tacha-border"}`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-tacha-surface transition-all ${isChecked ? "left-[22px]" : "left-0.5"}`}
      />
    </span>
    {isChecked ? LIST_SETTINGS_TEXT.SWITCH_ON : LIST_SETTINGS_TEXT.SWITCH_OFF}
  </button>
);

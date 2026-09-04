import { FORM_FIELD_STATE } from "@/app/constants";
import type { InputProps } from "./models/InputProps.interface";

/**
 * FormField: label + input + helper/error text. Presentacional puro —
 * el llamador es dueño del estado (controlado vía value/onChange).
 */
export const Input = ({
  label,
  value,
  onChange,
  helperText,
  errorMessage,
  placeholder,
  type = "text",
  isRequired = false,
}: InputProps): React.JSX.Element => {
  const fieldState = errorMessage ? FORM_FIELD_STATE.ERROR : FORM_FIELD_STATE.DEFAULT;
  const borderClassName =
    fieldState === FORM_FIELD_STATE.ERROR
      ? "border-red-500 focus:ring-red-500"
      : "border-tacha-border focus:ring-tacha-teal";

  return (
    <label className="flex flex-col gap-1 font-body text-sm">
      <span className="font-medium text-tacha-text">
        {label}
        {isRequired ? <span className="text-tacha-terracotta"> *</span> : null}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        required={isRequired}
        onChange={(event) => onChange(event.target.value)}
        className={`rounded-tacha-badge border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 ${borderClassName}`}
      />
      {errorMessage ? (
        <span className="text-red-600">{errorMessage}</span>
      ) : helperText ? (
        <span className="text-tacha-textsec">{helperText}</span>
      ) : null}
    </label>
  );
};

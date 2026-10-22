import { useId } from "react";
import { FORM_FIELD_STATE } from "@/constants";
import type { InputProps } from "./models/InputProps.interface";

/**
 * FormField: label + input + helper/error text. Presentacional puro —
 * el llamador es dueño del estado (controlado vía value/onChange).
 *
 * El texto de ayuda o de error va FUERA del <label> (SCRUM-137): dentro, el lector de pantalla
 * lo anunciaba como parte del nombre del campo y los selectores por etiqueta se rompían al
 * aparecer un error. Se liga al campo con aria-describedby; un campo con error lleva aria-invalid.
 */
export const Input = ({
  label,
  value,
  onChange,
  onBlur,
  helperText,
  errorMessage,
  placeholder,
  type = "text",
  isRequired = false,
}: InputProps): React.JSX.Element => {
  // useId da un id único y estable entre el servidor y el navegador, aunque haya varios Input en la pantalla.
  const inputId = useId();
  const descriptionId = `${inputId}-descripcion`;
  const description = errorMessage ?? helperText;

  const fieldState = errorMessage ? FORM_FIELD_STATE.ERROR : FORM_FIELD_STATE.DEFAULT;
  const isInvalid = fieldState === FORM_FIELD_STATE.ERROR;
  const borderClassName = isInvalid
    ? "border-red-500 focus:ring-red-500"
    : "border-tacha-border focus:ring-tacha-teal";

  return (
    <div className="flex flex-col gap-1 font-body text-sm">
      <label htmlFor={inputId} className="font-medium text-tacha-text">
        {label}
        {isRequired ? <span className="text-tacha-terracotta"> *</span> : null}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        placeholder={placeholder}
        required={isRequired}
        aria-invalid={isInvalid ? true : undefined}
        aria-describedby={description ? descriptionId : undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`rounded-tacha-badge border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 ${borderClassName}`}
      />
      {description ? (
        <p id={descriptionId} className={isInvalid ? "text-red-600" : "text-tacha-textsec"}>
          {description}
        </p>
      ) : null}
    </div>
  );
};

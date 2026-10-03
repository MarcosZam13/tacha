"use client";

import { FORM_FIELD_STATE } from "@/constants";
import { PASSWORD_TOGGLE_LABEL } from "../constants/login.constants";
import { usePasswordInputViewModel } from "../hooks/usePasswordInputViewModel";
import type { PasswordInputProps } from "../models/PasswordInputProps.interface";
import { EyeIcon } from "./EyeIcon";

/**
 * Campo de contraseña con botón para mostrar u ocultar el texto. Misma apariencia que
 * `Input`, pero el botón va fuera del <label> (un botón dentro de un label es HTML inválido).
 */
export const PasswordInput = ({
  errorMessage,
  isRequired = false,
  label,
  onChange,
  value,
}: PasswordInputProps): React.JSX.Element => {
  const { errorId, inputId, inputType, isVisible, toggleVisibility } = usePasswordInputViewModel();

  const fieldState = errorMessage ? FORM_FIELD_STATE.ERROR : FORM_FIELD_STATE.DEFAULT;
  const borderClassName =
    fieldState === FORM_FIELD_STATE.ERROR
      ? "border-red-500 focus:ring-red-500"
      : "border-tacha-border focus:ring-tacha-teal";

  return (
    <div className="flex flex-col gap-1 font-body text-sm">
      <label htmlFor={inputId} className="font-medium text-tacha-text">
        {label}
        {isRequired ? <span className="text-tacha-terracotta"> *</span> : null}
      </label>

      <div className="relative">
        <input
          id={inputId}
          type={inputType}
          value={value}
          required={isRequired}
          aria-invalid={Boolean(errorMessage)}
          aria-describedby={errorMessage ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`w-full rounded-tacha-badge border bg-tacha-surface px-3 py-2 pr-11 text-tacha-text outline-none focus:ring-2 ${borderClassName}`}
        />
        <button
          type="button"
          onClick={toggleVisibility}
          aria-label={isVisible ? PASSWORD_TOGGLE_LABEL.HIDE : PASSWORD_TOGGLE_LABEL.SHOW}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-tacha-textsec hover:text-tacha-text"
        >
          <EyeIcon isCrossed={isVisible} />
        </button>
      </div>

      {errorMessage ? (
        <span id={errorId} className="text-red-600">
          {errorMessage}
        </span>
      ) : null}
    </div>
  );
};
import { useEffect, useId, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { FINANCE_TEXT, TOTAL_EDIT_STATUS } from "../constants/finance.constants";
import type { TotalEditStatusType } from "../constants/finance.constants";
import type { InlineTotalEditorProps } from "./models/InlineTotalEditorProps.interface";

const ESCAPE_KEY = "Escape";

/**
 * El campo abierto de un total (SCRUM-91, SPEC §6 a §9), dentro de la fila de
 * la compra o del bloque del total. Solo presentación y foco: qué se valida,
 * qué se guarda y qué zona se confirma lo decide useTotalEdit.
 *
 * El campo es nativo, como el del presupuesto: Input de components/ui no acepta
 * ref, aria-invalid, aria-describedby ni teclas. El foco va al campo al abrirlo
 * y vuelve a él si el guardado falla; al cerrarlo lo devuelve el lápiz.
 */
export const InlineTotalEditor = ({
  errorMessage,
  inputLabel,
  onCancel,
  onConfirmTimeZone,
  onSave,
  onTextChange,
  status,
  text,
  timeZoneToConfirm,
}: InlineTotalEditorProps): React.JSX.Element => {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const previousStatusRef = useRef<TotalEditStatusType>(status);

  const isSaving = status === TOTAL_EDIT_STATUS.SAVING;

  // Se monta al abrir el campo: el foco va al campo. Al guardar el foco queda en
  // "Guardar", o se pierde con el campo deshabilitado; si el guardado falla,
  // vuelve al campo. Se mira la llegada a `saveFailed`, no el paso por `saving`:
  // los dos cambios pueden llegar en un mismo render.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;
    if (previousStatus !== TOTAL_EDIT_STATUS.SAVE_FAILED && status === TOTAL_EDIT_STATUS.SAVE_FAILED) {
      inputRef.current?.focus();
    }
  }, [status]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ESCAPE_KEY) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={isSaving} className="flex w-full flex-col gap-2">
      <label htmlFor={inputId} className="font-body text-sm font-medium text-tacha-text">
        {inputLabel}
      </label>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        inputMode="numeric"
        value={text}
        disabled={isSaving}
        aria-invalid={errorMessage ? true : undefined}
        aria-describedby={errorMessage ? errorId : undefined}
        onChange={(event) => onTextChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className={`rounded-tacha-badge border bg-tacha-surface px-3 py-2 font-body text-sm text-tacha-text outline-none focus:ring-2 disabled:opacity-50 ${
          errorMessage ? "border-red-500 focus:ring-red-500" : "border-tacha-border focus:ring-tacha-teal"
        }`}
      />
      {errorMessage ? (
        // El error de guardado se anuncia; el de validación queda ligado al campo.
        <p
          id={errorId}
          role={status === TOTAL_EDIT_STATUS.SAVE_FAILED ? "alert" : undefined}
          className="font-body text-sm text-red-600"
        >
          {errorMessage}
        </p>
      ) : null}
      {timeZoneToConfirm ? (
        // Con TZ001 o TZ002: la zona del navegador y "Confirmar". Nunca se guarda sin ese toque (regla 59).
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-body text-sm text-tacha-text">
            {FINANCE_TEXT.TIME_ZONE_PREFIX}
            {timeZoneToConfirm}
          </p>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onConfirmTimeZone}>
            {FINANCE_TEXT.CONFIRM_TIME_ZONE}
          </Button>
        </div>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" isDisabled={isSaving}>
          {isSaving ? FINANCE_TEXT.SAVING : FINANCE_TEXT.SAVE}
        </Button>
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onCancel}>
          {FINANCE_TEXT.CANCEL}
        </Button>
      </div>
    </form>
  );
};

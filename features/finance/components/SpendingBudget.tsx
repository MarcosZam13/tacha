import { useEffect, useId, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { BUDGET_STATUS, FINANCE_TEXT } from "../constants/finance.constants";
import type { BudgetStatusType } from "../constants/finance.constants";
import type { SpendingBudgetProps } from "./models/SpendingBudgetProps.interface";

// Estados con el campo abierto.
const EDIT_STATUSES: readonly BudgetStatusType[] = [
  BUDGET_STATUS.EDITING,
  BUDGET_STATUS.SAVING,
  BUDGET_STATUS.SAVE_FAILED,
];

const ESCAPE_KEY = "Escape";

/**
 * El presupuesto del periodo elegido (SPEC §6 a §9): el monto o "Sin
 * presupuesto…", la diferencia con el gasto y el campo para definirlo o
 * editarlo. Solo presentación y foco: qué se valida y qué se guarda lo decide
 * useSpendingBudgets.
 *
 * El campo y el botón de editar son nativos: Input y Button de components/ui
 * no aceptan ref, aria-invalid, aria-describedby ni teclas, y SPEC §9 los
 * pide. El foco va al campo al abrirlo y vuelve a "Editar presupuesto" al
 * guardar o cancelar.
 */
export const SpendingBudget = ({
  actionLabel,
  amountText,
  differenceText,
  errorMessage,
  inputLabel,
  label,
  noBudgetText,
  notIncludedText,
  onCancel,
  onEdit,
  onRetry,
  onSave,
  onTextChange,
  status,
  text,
}: SpendingBudgetProps): React.JSX.Element => {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const previousStatusRef = useRef<BudgetStatusType>(status);

  const isEditing = EDIT_STATUSES.includes(status);
  const isSaving = status === BUDGET_STATUS.SAVING;

  // Foco (SPEC §9): al abrir el campo, al campo; al cerrarlo (guardó o canceló),
  // al botón. Mientras guarda el campo está deshabilitado y pierde el foco: si
  // el guardado falla, vuelve al campo para corregir o reintentar.
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const wasEditing = EDIT_STATUSES.includes(previousStatus);
    previousStatusRef.current = status;

    if (!wasEditing && isEditing) inputRef.current?.focus();
    if (previousStatus === BUDGET_STATUS.SAVING && status === BUDGET_STATUS.SAVE_FAILED) inputRef.current?.focus();
    if (wasEditing && status === BUDGET_STATUS.VIEWING) editButtonRef.current?.focus();
  }, [isEditing, status]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ESCAPE_KEY) onCancel();
  };

  if (status === BUDGET_STATUS.LOADING) return <Spinner label={label} />;

  if (status === BUDGET_STATUS.LOAD_FAILED) {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="font-body text-sm font-medium text-tacha-textsec">{label}</p>
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRetry}>
          {FINANCE_TEXT.RETRY}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <p className="font-body text-sm font-medium text-tacha-textsec">{label}</p>
        <p className="font-display text-4xl font-semibold text-tacha-text">{amountText ?? noBudgetText}</p>
        {differenceText ? <p className="font-body text-sm font-semibold text-tacha-text">{differenceText}</p> : null}
        {notIncludedText ? <p className="font-body text-xs text-tacha-textsec">{notIncludedText}</p> : null}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} aria-busy={isSaving} className="flex flex-col gap-2">
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
              role={status === BUDGET_STATUS.SAVE_FAILED ? "alert" : undefined}
              className="font-body text-sm text-red-600"
            >
              {errorMessage}
            </p>
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
      ) : (
        <div>
          <button
            ref={editButtonRef}
            type="button"
            onClick={onEdit}
            className="rounded-tacha-badge border border-tacha-teal px-4 py-2 font-body text-sm font-semibold text-tacha-teal hover:bg-tacha-teal/10"
          >
            {actionLabel}
          </button>
        </div>
      )}
    </div>
  );
};

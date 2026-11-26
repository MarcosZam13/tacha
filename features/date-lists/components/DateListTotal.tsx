import { useEffect, useId, useRef } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Pencil } from "lucide-react";
import { Button, Icon } from "@/components/ui";
import { BUTTON_VARIANT, ICON_SIZE } from "@/constants";
import { formatColones } from "@/features/finance/utils/formatColones";
import type { NullableRef } from "@/types/nullable.types";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";
import type { DateListTotalEditor } from "../hooks/useDateListTotalEditor";

const ESCAPE_KEY = "Escape";

interface DateListTotalProps {
  /** Cancelada: el total se ve pero no se cambia (SPEC §10, regla 4). */
  canEdit: boolean;
  editor: DateListTotalEditor;
  /** Otro cambio de la sublista en camino. */
  isBusy: boolean;
  total: NullableRef<number>;
}

/**
 * "Total gastado" de la sublista (SCRUM-79, SPEC §10): el monto o "Sin total" y un lápiz; abierto,
 * el campo con Guardar y Cancelar. El campo es nativo, como en Finanzas: Input de components/ui no
 * acepta ref ni aria-invalid. El foco va al campo al abrirlo y vuelve al lápiz al cerrarlo.
 */
export const DateListTotal = ({ canEdit, editor, isBusy, total }: DateListTotalProps): React.JSX.Element => {
  const inputId = useId();
  const errorId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(editor.isOpen);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = editor.isOpen;
    if (editor.isOpen && !wasOpen) inputRef.current?.focus();
    if (!editor.isOpen && wasOpen) editButtonRef.current?.focus();
  }, [editor.isOpen]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    editor.onSave();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === ESCAPE_KEY) editor.onCancel();
  };

  if (editor.isOpen && canEdit) {
    return (
      <form onSubmit={handleSubmit} aria-busy={editor.isSaving} className="flex flex-col gap-2">
        <label htmlFor={inputId} className="font-body text-sm font-medium text-tacha-text">
          {DATE_LIST_TEXT.TOTAL_INPUT_LABEL}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          value={editor.text}
          disabled={editor.isSaving}
          aria-invalid={editor.errorMessage ? true : undefined}
          aria-describedby={editor.errorMessage ? errorId : undefined}
          onChange={(event) => editor.onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className={`rounded-tacha-badge border bg-tacha-surface px-3 py-2 font-body text-sm text-tacha-text outline-none focus:ring-2 disabled:opacity-50 ${
            editor.errorMessage ? "border-tacha-danger focus:ring-tacha-danger" : "border-tacha-border focus:ring-tacha-teal"
          }`}
        />
        {editor.errorMessage ? (
          <p id={errorId} role="alert" className="font-body text-sm text-tacha-danger">
            {editor.errorMessage}
          </p>
        ) : null}
        <div className="flex gap-2">
          <Button type="submit" isDisabled={editor.isSaving}>
            {editor.isSaving ? DATE_LIST_TEXT.TOTAL_SAVING : DATE_LIST_TEXT.TOTAL_SAVE}
          </Button>
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={editor.isSaving} onClick={editor.onCancel}>
            {DATE_LIST_TEXT.TOTAL_CANCEL}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <p className="font-body text-sm text-tacha-text">
        {DATE_LIST_TEXT.TOTAL_LABEL}:{" "}
        <span className="font-semibold">{total === null ? DATE_LIST_TEXT.TOTAL_WITHOUT : formatColones(total)}</span>
      </p>
      {canEdit ? (
        <button
          ref={editButtonRef}
          type="button"
          aria-label={DATE_LIST_TEXT.TOTAL_EDIT}
          disabled={isBusy}
          onClick={() => editor.onOpen(total)}
          className="rounded-tacha-badge p-1.5 text-tacha-teal hover:bg-tacha-teal/10 disabled:opacity-50 disabled:hover:bg-transparent"
        >
          <Icon icon={Pencil} size={ICON_SIZE.SMALL} />
        </button>
      ) : null}
    </div>
  );
};

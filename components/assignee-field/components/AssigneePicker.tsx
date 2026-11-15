import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";
import { toAssigneeOptions } from "../utils/toAssigneeOptions";
import type { AssigneeFieldProps } from "./models/AssigneeFieldProps.interface";

const OPTION_CLASS_NAME =
  "w-full rounded-tacha-badge border px-4 py-2 text-left font-body text-sm text-tacha-text transition-opacity disabled:cursor-not-allowed disabled:opacity-50";
const SELECTED_OPTION_CLASS_NAME = "border-tacha-teal bg-tacha-chipbg font-semibold";
const OPTION_BORDER_CLASS_NAME = "border-tacha-border bg-tacha-surface hover:bg-tacha-chipbg";

/**
 * El selector de encargado (SPEC §8): "Sin asignar" y una opción por cada persona con acceso a la lista, con la
 * actual marcada. Elegir guarda de inmediato; mientras guarda, todo queda deshabilitado.
 */
export const AssigneePicker = ({ itemId, viewModel }: AssigneeFieldProps): React.JSX.Element => {
  const isSaving = viewModel.savingItemId !== null;
  const selectedId = viewModel.selectedIdOf(itemId);

  return (
    <Modal isOpen onClose={viewModel.onClose} title={ASSIGNEE_TEXT.PICKER_TITLE}>
      <ul className="mb-4 flex flex-col gap-2">
        {toAssigneeOptions(viewModel.candidates).map((option) => {
          const isSelected = option.assigneeId === selectedId;

          return (
            <li key={option.assigneeId ?? ASSIGNEE_TEXT.UNASSIGNED}>
              <button
                type="button"
                disabled={isSaving}
                aria-pressed={isSelected}
                onClick={() => viewModel.onSelect(itemId, option.assigneeId)}
                className={`${OPTION_CLASS_NAME} ${isSelected ? SELECTED_OPTION_CLASS_NAME : OPTION_BORDER_CLASS_NAME}`}
              >
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
      {isSaving ? <p className="mb-4 font-body text-sm text-tacha-textsec">{ASSIGNEE_TEXT.SAVING}</p> : null}
      {viewModel.errorMessage ? (
        <p role="alert" className="mb-4 font-body text-sm text-tacha-danger">
          {viewModel.errorMessage}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={viewModel.onClose}>
          {ASSIGNEE_TEXT.CANCEL}
        </Button>
      </div>
    </Modal>
  );
};

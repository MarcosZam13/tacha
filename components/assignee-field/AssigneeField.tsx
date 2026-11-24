import { ASSIGNEE_TEXT } from "./constants/assignee-field.constants";
import { AssigneePicker } from "./components/AssigneePicker";
import type { AssigneeFieldProps } from "./components/models/AssigneeFieldProps.interface";
import { useReturnFocus } from "./hooks/useReturnFocus";

/**
 * El campo "Encargado" de la fila de una lista (SCRUM-108 / HU-78): quién debe comprar ese producto. Es un
 * botón de texto pequeño, en la segunda línea de la fila, que abre el selector. Con el ajuste de la lista
 * apagado no dibuja nada. La pantalla de la lista le pasa el ViewModel de `useListAssigneesViewModel`.
 */
export const AssigneeField = ({ className = "", itemId, viewModel }: AssigneeFieldProps): React.JSX.Element | null => {
  const isOpen = viewModel.openItemId === itemId;
  const triggerRef = useReturnFocus(isOpen);

  if (!viewModel.isEnabled) return null;

  const assigneeName = viewModel.nameOf(itemId);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${ASSIGNEE_TEXT.FIELD_LABEL}: ${assigneeName}. ${ASSIGNEE_TEXT.CHANGE}`}
        onClick={() => viewModel.onOpen(itemId)}
        className={`self-start font-body text-xs text-tacha-textsec hover:underline ${className}`}
      >
        {ASSIGNEE_TEXT.FIELD_LABEL}: {assigneeName}
      </button>
      {isOpen ? <AssigneePicker itemId={itemId} viewModel={viewModel} /> : null}
    </>
  );
};

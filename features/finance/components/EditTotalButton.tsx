import { useEffect, useRef } from "react";
import type { Ref, RefObject } from "react";
import { Pencil } from "lucide-react";
import { Icon } from "@/components/ui";
import { ICON_SIZE } from "@/constants";
import type { EditTotalButtonProps } from "./models/EditTotalButtonProps.interface";

/**
 * El lápiz de un total (SCRUM-91, SPEC §8 y §9): un `<button>` con nombre
 * propio; el ícono es decorativo. Nativo, como el botón del presupuesto: Button
 * de components/ui no acepta ref ni aria-label, y el foco tiene que volver acá.
 */
export const EditTotalButton = ({
  isDisabled,
  label,
  onClick,
  ref,
}: EditTotalButtonProps & { ref?: Ref<HTMLButtonElement> }): React.JSX.Element => (
  <button
    ref={ref}
    type="button"
    aria-label={label}
    disabled={isDisabled}
    onClick={onClick}
    className="rounded-tacha-badge p-1.5 text-tacha-teal hover:bg-tacha-teal/10 disabled:opacity-50 disabled:hover:bg-transparent"
  >
    <Icon icon={Pencil} size={ICON_SIZE.SMALL} />
  </button>
);

/**
 * Foco al cerrar el campo (SPEC §9): al guardar o cancelar vuelve al lápiz. Solo
 * si el foco quedó en el aire: si se abrió el campo de otro total (D21), el
 * foco ya está ahí y no se le quita.
 */
export const useFocusOnEditorClose = (isEditorOpen: boolean): RefObject<HTMLButtonElement | null> => {
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const wasEditorOpenRef = useRef<boolean>(isEditorOpen);

  useEffect(() => {
    const wasEditorOpen = wasEditorOpenRef.current;
    wasEditorOpenRef.current = isEditorOpen;
    const isFocusLost = document.activeElement === null || document.activeElement === document.body;
    if (wasEditorOpen && !isEditorOpen && isFocusLost) editButtonRef.current?.focus();
  }, [isEditorOpen]);

  return editButtonRef;
};

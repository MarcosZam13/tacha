import { EditTotalButton, useFocusOnEditorClose } from "./EditTotalButton";
import { InlineTotalEditor } from "./InlineTotalEditor";
import type { PurchaseSessionRowProps } from "./models/PurchaseSessionRowProps.interface";

/**
 * Una compra del Historial: fecha, supermercado y monto (CA-01), con su lápiz
 * (SCRUM-91, CA-01). Solo presentación: el ViewModel ya trae los textos y la
 * edición. "Sin total" se ve como cualquier monto, sin color de error (D8; el
 * badge es de HU-61). Con el campo abierto, el campo ocupa el lugar del monto.
 */
export const PurchaseSessionRow = ({
  amountText,
  dateText,
  edit,
  editor,
  storeText,
}: PurchaseSessionRowProps): React.JSX.Element => {
  const editButtonRef = useFocusOnEditorClose(editor !== null);

  return (
    <li className="flex flex-col gap-3 px-4 py-3 font-body">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-medium text-tacha-text">{dateText}</p>
          <p className="break-words text-sm text-tacha-textsec">{storeText}</p>
        </div>
        {editor ? null : (
          <div className="flex shrink-0 items-center gap-1">
            <p className="text-sm font-semibold text-tacha-text">{amountText}</p>
            <EditTotalButton ref={editButtonRef} {...edit} />
          </div>
        )}
      </div>
      {editor ? <InlineTotalEditor {...editor} /> : null}
    </li>
  );
};

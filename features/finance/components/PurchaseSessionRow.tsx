import { Chip } from "@/components/ui";
import { CHIP_TONE } from "@/constants";
import { EditTotalButton, useFocusOnEditorClose } from "./EditTotalButton";
import { InlineTotalEditor } from "./InlineTotalEditor";
import type { PurchaseSessionRowProps } from "./models/PurchaseSessionRowProps.interface";

/**
 * Una compra del Historial: fecha, supermercado y monto (CA-01), con su lápiz
 * (SCRUM-91, CA-01). Solo presentación: el ViewModel ya trae los textos y la
 * edición. Una compra sin total muestra "Sin total" como badge terracota, con
 * texto de contraste AA y sin aspecto de error: ni rojo, ni ícono, ni
 * role="alert" (SCRUM-92, CA-01, D27). Con el campo abierto, el campo ocupa el
 * lugar del monto.
 */
export const PurchaseSessionRow = ({
  amountText,
  dateText,
  edit,
  editor,
  hasNoTotal,
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
            {hasNoTotal ? (
              <Chip tone={CHIP_TONE.TERRACOTTA_STRONG}>{amountText}</Chip>
            ) : (
              <p className="text-sm font-semibold text-tacha-text">{amountText}</p>
            )}
            <EditTotalButton ref={editButtonRef} {...edit} />
          </div>
        )}
      </div>
      {editor ? <InlineTotalEditor {...editor} /> : null}
    </li>
  );
};

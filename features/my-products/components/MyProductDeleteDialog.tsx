import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MY_PRODUCT_DELETE_TEXT } from "../constants/my-products.constants";
import type { MyProductDeletionViewModel } from "../models/my-product-deletion.interfaces";

/**
 * Confirmación antes de eliminar un producto personalizado (SCRUM-89 / HU-58
 * CA-02). Solo presentación: qué pasa al confirmar o cancelar lo decide
 * useMyProductDeletion. Mismo diseño que RecipeDeleteDialog.
 *
 * Si el producto está en listas activas o recetas, el aviso dice cuántas;
 * role="status" porque llega después de abrir el diálogo, cuando la base
 * responde el conteo.
 */
export const MyProductDeleteDialog = ({
  errorMessage,
  isDeleting,
  isDialogOpen,
  onDeleteCancel,
  onDeleteConfirm,
  productName,
  usageNotice,
}: MyProductDeletionViewModel): React.JSX.Element => (
  <Modal isOpen={isDialogOpen} onClose={onDeleteCancel} title={MY_PRODUCT_DELETE_TEXT.DIALOG_TITLE}>
    <div className="flex flex-col gap-4">
      <p className="font-body text-base font-semibold text-tacha-text">{productName}</p>
      <p className="font-body text-sm text-tacha-textsec">{MY_PRODUCT_DELETE_TEXT.IRREVERSIBLE_NOTICE}</p>
      {usageNotice ? (
        <p role="status" className="font-body text-sm font-semibold text-tacha-terracotta">
          {usageNotice}
        </p>
      ) : null}
      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-3">
        <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isDeleting} onClick={onDeleteCancel}>
          {MY_PRODUCT_DELETE_TEXT.CANCEL}
        </Button>
        <Button variant={BUTTON_VARIANT.DESTRUCTIVE} isDisabled={isDeleting} onClick={onDeleteConfirm}>
          {isDeleting ? MY_PRODUCT_DELETE_TEXT.DELETING : MY_PRODUCT_DELETE_TEXT.CONFIRM}
        </Button>
      </div>
    </div>
  </Modal>
);

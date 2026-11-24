import { useEffect, useState } from "react";
import { deletePersonalProduct, getPersonalProductUsage } from "@/services/personal-product.service";
import type { PersonalProductUsage } from "@/services/personal-product.service";
import type { NullableRef } from "@/types/nullable.types";
import { MY_PRODUCT_DELETE_TEXT, MY_PRODUCT_DELETION_STATUS } from "../constants/my-products.constants";
import type {
  MyProductDeletionViewModel,
  UseMyProductDeletionParams,
} from "../models/my-product-deletion.interfaces";
import type { MyProductDeletionState, MyProductDeletionTarget } from "../models/my-product-deletion.types";
import { toUsageNoticeText } from "../utils/toUsageNoticeText";

const IDLE_STATE: MyProductDeletionState = { status: MY_PRODUCT_DELETION_STATUS.IDLE };

/**
 * Eliminar un producto personalizado (SCRUM-89 / HU-58): elegirlo, confirmar
 * en el diálogo y eliminarlo. Mismo patrón que useRecipeDeletion
 * (features/recipes): unión de estados en vez de booleanos sueltos.
 *
 * Al pedir eliminar cuenta en cuántas listas activas y recetas está, para el
 * aviso de CA-02. Si no se puede contar, el diálogo se abre sin el aviso y
 * eliminar sigue funcionando: la base decide sola si borra o archiva.
 */
export const useMyProductDeletion = ({ onDeleted }: UseMyProductDeletionParams): MyProductDeletionViewModel => {
  const [state, setState] = useState<MyProductDeletionState>(IDLE_STATE);
  // Uso del producto elegido; null mientras se cuenta o si no se pudo.
  const [usage, setUsage] = useState<NullableRef<PersonalProductUsage>>(null);
  const isDeleting = state.status === MY_PRODUCT_DELETION_STATUS.DELETING;
  // El id y no el estado: el conteo corre solo cuando cambia el producto elegido.
  const selectedProductId = state.status === MY_PRODUCT_DELETION_STATUS.IDLE ? null : state.product.productId;

  useEffect(() => {
    // Si el diálogo se cierra o cambia de producto antes de que responda la base, la respuesta se ignora.
    let isCancelled = false;

    if (selectedProductId !== null) {
      getPersonalProductUsage(selectedProductId)
        .then((nextUsage) => {
          if (!isCancelled) setUsage(nextUsage);
        })
        .catch(() => {
          // Sin aviso: no es un error que el usuario tenga que ver, solo falta una advertencia.
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [selectedProductId]);

  const onDeleteRequest = (product: MyProductDeletionTarget): void => {
    // El conteo del producto anterior no vale para este.
    setUsage(null);
    setState({ product, status: MY_PRODUCT_DELETION_STATUS.CONFIRMING });
  };

  const onDeleteCancel = (): void => {
    // Mientras elimina no se cierra: la petición ya salió y su resultado se tiene que ver.
    if (isDeleting) return;
    setState(IDLE_STATE);
  };

  const deleteSelectedProduct = async (product: MyProductDeletionTarget): Promise<void> => {
    setState({ product, status: MY_PRODUCT_DELETION_STATUS.DELETING });
    try {
      // 'deleted' o 'archived': para el usuario es lo mismo, el producto deja de aparecer.
      await deletePersonalProduct(product.productId);
      setState(IDLE_STATE);
      onDeleted();
    } catch {
      // El diálogo sigue abierto con el mismo producto: "Eliminar" reintenta.
      setState({ product, status: MY_PRODUCT_DELETION_STATUS.FAILED });
    }
  };

  const onDeleteConfirm = (): void => {
    // Sin producto elegido no hay qué eliminar; mientras elimina no se manda otra vez (doble clic).
    if (state.status === MY_PRODUCT_DELETION_STATUS.IDLE || isDeleting) return;
    void deleteSelectedProduct(state.product);
  };

  return {
    errorMessage: state.status === MY_PRODUCT_DELETION_STATUS.FAILED ? MY_PRODUCT_DELETE_TEXT.ERROR : null,
    isDeleting,
    isDialogOpen: state.status !== MY_PRODUCT_DELETION_STATUS.IDLE,
    onDeleteCancel,
    onDeleteConfirm,
    onDeleteRequest,
    productName: state.status === MY_PRODUCT_DELETION_STATUS.IDLE ? null : state.product.name,
    usageNotice: toUsageNoticeText(usage),
  };
};

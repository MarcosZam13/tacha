import type { NullableRef } from "@/types/nullable.types";
import type { MyProductDeletionTarget } from "./my-product-deletion.types";

// Interfaces de eliminar un producto personalizado (SCRUM-89 / HU-58).

/** Lo que recibe useMyProductDeletion desde el ViewModel de "Mis productos". */
export interface UseMyProductDeletionParams {
  /** Se llama cuando la base confirmó que lo eliminó (o lo archivó), para refrescar el listado. */
  onDeleted: () => void;
}

/** Lo que useMyProductDeletion le entrega a la pantalla: el diálogo y el botón de cada tarjeta. */
export interface MyProductDeletionViewModel {
  /** Mensaje de error dentro del diálogo; null si no falló. */
  errorMessage: NullableRef<string>;
  isDeleting: boolean;
  isDialogOpen: boolean;
  onDeleteCancel: () => void;
  onDeleteConfirm: () => void;
  onDeleteRequest: (product: MyProductDeletionTarget) => void;
  /** Nombre del producto elegido; null con el diálogo cerrado. */
  productName: NullableRef<string>;
  /**
   * Aviso de CA-02 ("Está en 2 listas activas y 1 receta…"); null si no se
   * usa, si todavía se está contando o si no se pudo contar.
   */
  usageNotice: NullableRef<string>;
}

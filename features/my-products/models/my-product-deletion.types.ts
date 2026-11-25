import type { EditablePersonalProduct } from "@/types/personal-product.types";
import type { MY_PRODUCT_DELETION_STATUS } from "../constants/my-products.constants";

// Types de eliminar un producto personalizado (SCRUM-89 / HU-58). Las
// interfaces están en my-product-deletion.interfaces.ts.

/** El producto que se está por eliminar: el id para la base y el nombre para el diálogo. */
export type MyProductDeletionTarget = Pick<EditablePersonalProduct, "name" | "productId">;

/**
 * Unión discriminada por `status`, mismo patrón que la eliminación de
 * recetas (features/recipes/models/recipe-deletion.types.ts): fuera de
 * `idle` siempre hay un producto elegido, así que no se puede llegar a
 * "eliminando" sin saber cuál.
 */
export type MyProductDeletionState =
  | { status: typeof MY_PRODUCT_DELETION_STATUS.IDLE }
  | { status: typeof MY_PRODUCT_DELETION_STATUS.CONFIRMING; product: MyProductDeletionTarget }
  | { status: typeof MY_PRODUCT_DELETION_STATUS.DELETING; product: MyProductDeletionTarget }
  | { status: typeof MY_PRODUCT_DELETION_STATUS.FAILED; product: MyProductDeletionTarget };

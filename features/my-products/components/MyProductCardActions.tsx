import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MY_PRODUCT_ACTION_TEXT } from "../constants/my-products.constants";
import type { MyProductCardActionsProps } from "./models/MyProductCardActionsProps.interface";

/**
 * Botones "Editar" y "Eliminar" de una tarjeta de "Mis productos" (SCRUM-89 /
 * HU-58 CA-01). Solo presentación: qué hace cada uno lo decide quien lo usa.
 * El nombre del producto va oculto en cada botón (mismo criterio que
 * RecipeCard): con varias tarjetas, el lector de pantalla diría muchos
 * "Eliminar" iguales sin saber de cuál.
 */
export const MyProductCardActions = ({ onDelete, onEdit, productName }: MyProductCardActionsProps): React.JSX.Element => (
  <div className="flex justify-between gap-2">
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onEdit}>
      {MY_PRODUCT_ACTION_TEXT.EDIT}
      <span className="sr-only"> {productName}</span>
    </Button>
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onDelete}>
      {MY_PRODUCT_ACTION_TEXT.TRIGGER_DELETE}
      <span className="sr-only"> {productName}</span>
    </Button>
  </div>
);

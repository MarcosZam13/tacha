import Link from "next/link";
import { Button } from "@/components/ui";
import { APP_ROUTE } from "@/constants";
import { PRODUCT_GROUP_EDITOR_TEXT } from "../constants/product-group-editor.constants";
import type { ProductGroupEditorActionsProps } from "./models/ProductGroupEditorActionsProps.interface";

/**
 * "Guardar grupo" envía el formulario; se deshabilita mientras guarda para que
 * un doble clic no mande dos veces. "Cancelar" es un link (es navegación, no
 * una acción): vuelve a "Mis grupos" sin guardar. Mismo patrón que
 * RecipeEditorActions.
 */
export const ProductGroupEditorActions = ({ isSaving }: ProductGroupEditorActionsProps): React.JSX.Element => (
  <div className="flex flex-wrap items-center gap-3">
    <Button type="submit" isDisabled={isSaving}>
      {isSaving ? PRODUCT_GROUP_EDITOR_TEXT.SAVING : PRODUCT_GROUP_EDITOR_TEXT.SAVE}
    </Button>
    <Link
      href={APP_ROUTE.LIST_GROUPS}
      className="rounded-tacha-badge border border-tacha-teal px-4 py-2 font-body text-sm font-semibold text-tacha-teal hover:bg-tacha-teal/10"
    >
      {PRODUCT_GROUP_EDITOR_TEXT.CANCEL}
    </Link>
  </div>
);

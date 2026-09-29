import Link from "next/link";
import { Button } from "@/components/ui";
import { RECIPE_EDITOR_TEXT, RECIPE_ROUTE } from "../constants/recipes.constants";
import type { RecipeEditorActionsProps } from "./models/RecipeEditorActionsProps.interface";

/**
 * "Guardar" envía el formulario; se deshabilita mientras guarda para que un
 * doble clic no mande dos veces. "Cancelar" es un link (es navegación, no una
 * acción): vuelve al catálogo sin guardar.
 */
export const RecipeEditorActions = ({ isSaving }: RecipeEditorActionsProps): React.JSX.Element => (
  <div className="flex flex-wrap items-center gap-3">
    <Button type="submit" isDisabled={isSaving}>
      {isSaving ? RECIPE_EDITOR_TEXT.SAVING : RECIPE_EDITOR_TEXT.SAVE}
    </Button>
    <Link
      href={RECIPE_ROUTE.CATALOG}
      className="rounded-tacha-badge border border-tacha-teal px-4 py-2 font-body text-sm font-semibold text-tacha-teal hover:bg-tacha-teal/10"
    >
      {RECIPE_EDITOR_TEXT.CANCEL}
    </Link>
  </div>
);

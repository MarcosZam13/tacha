import type { RecipeCardCopy } from "../../models/recipe-sharing.interfaces";

export interface RecipeCopyActionProps {
  copy: RecipeCardCopy;
  onCopyRequest: () => void;
  recipeName: string;
}

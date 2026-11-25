import { Button } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { RECIPE_COPY_TEXT } from "../constants/recipes.constants";
import type { RecipeCopyActionProps } from "./models/RecipeCopyActionProps.interface";

/** "Guardar copia personal" de una receta de la familia y su resultado. Solo presentación. */
export const RecipeCopyAction = ({ copy, onCopyRequest, recipeName }: RecipeCopyActionProps): React.JSX.Element => (
  <div className="flex flex-col gap-2">
    <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={copy.isCopying} onClick={onCopyRequest}>
      {copy.isCopying ? RECIPE_COPY_TEXT.COPYING : RECIPE_COPY_TEXT.TRIGGER}
      <span className="sr-only"> {recipeName}</span>
    </Button>
    {copy.successMessage ? (
      <p role="status" className="font-body text-sm text-tacha-textsec">
        {copy.successMessage}
      </p>
    ) : null}
    {copy.errorMessage ? (
      <p role="alert" className="font-body text-sm text-red-600">
        {copy.errorMessage}
      </p>
    ) : null}
  </div>
);

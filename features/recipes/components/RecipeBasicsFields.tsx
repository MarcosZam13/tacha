import { Input } from "@/components/ui";
import { RECIPE_EDITOR_TEXT } from "../constants/recipes.constants";
import type { RecipeBasicsFieldsProps } from "./models/RecipeBasicsFieldsProps.type";

/** Nombre y porciones base de la receta. Solo presentación. */
export const RecipeBasicsFields = ({
  baseServings,
  baseServingsError,
  name,
  nameError,
  onBaseServingsChange,
  onNameChange,
}: RecipeBasicsFieldsProps): React.JSX.Element => (
  <div className="flex flex-col gap-4 sm:flex-row">
    <div className="flex-1">
      <Input
        label={RECIPE_EDITOR_TEXT.NAME_LABEL}
        value={name}
        onChange={onNameChange}
        placeholder={RECIPE_EDITOR_TEXT.NAME_PLACEHOLDER}
        errorMessage={nameError}
        isRequired
      />
    </div>
    <div className="sm:w-40">
      <Input
        label={RECIPE_EDITOR_TEXT.SERVINGS_LABEL}
        value={baseServings}
        onChange={onBaseServingsChange}
        placeholder={RECIPE_EDITOR_TEXT.SERVINGS_PLACEHOLDER}
        errorMessage={baseServingsError}
        type="number"
        isRequired
      />
    </div>
  </div>
);

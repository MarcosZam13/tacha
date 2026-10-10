import Link from "next/link";
import { Button, Spinner } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MEAL_SLOT_FORM, MEAL_SLOT_TEXT, RECIPE_OPTIONS_STATUS } from "../constants/meal-planner.constants";
import type { MealSlotRecipeListProps } from "./models/MealSlotRecipeListProps.type";

/**
 * Las recetas del usuario como un grupo de opciones (radio): cargando, con
 * error, sin recetas o la lista. Solo presentación: qué receta está elegida lo
 * decide el ViewModel del diálogo. Un `fieldset` con `legend` le da al lector de
 * pantalla el nombre del grupo; cada opción dice su nombre y sus porciones base.
 */
export const MealSlotRecipeList = ({
  isSaving,
  onRecipeChoose,
  onRecipesRetry,
  recipeOptions,
  recipesStatus,
  selectedRecipeId,
}: MealSlotRecipeListProps): React.JSX.Element => (
  <fieldset disabled={isSaving} className="flex flex-col gap-2">
    <legend className="mb-1 font-body text-sm font-semibold text-tacha-text">{MEAL_SLOT_TEXT.RECIPE_LABEL}</legend>

    {recipesStatus === RECIPE_OPTIONS_STATUS.LOADING ? <Spinner label={MEAL_SLOT_TEXT.RECIPES_LOADING} /> : null}

    {recipesStatus === RECIPE_OPTIONS_STATUS.ERROR ? (
      <div role="alert" className="flex flex-col items-start gap-2 font-body text-sm text-red-600">
        <p>{MEAL_SLOT_TEXT.RECIPES_LOAD_ERROR}</p>
        <Button variant={BUTTON_VARIANT.SECONDARY} onClick={onRecipesRetry}>
          {MEAL_SLOT_TEXT.RETRY}
        </Button>
      </div>
    ) : null}

    {recipesStatus === RECIPE_OPTIONS_STATUS.READY && recipeOptions.length === 0 ? (
      <div className="flex flex-col items-start gap-1 font-body text-sm">
        <p className="text-tacha-textsec">{MEAL_SLOT_TEXT.NO_RECIPES}</p>
        <Link href={MEAL_SLOT_FORM.NEW_RECIPE_PATH} className="font-semibold text-tacha-teal hover:underline">
          {MEAL_SLOT_TEXT.CREATE_RECIPE}
        </Link>
      </div>
    ) : null}

    {recipesStatus === RECIPE_OPTIONS_STATUS.READY && recipeOptions.length > 0 ? (
      <ul className="flex max-h-56 flex-col gap-1 overflow-y-auto">
        {recipeOptions.map((option) => (
          <li key={option.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-tacha-badge border border-tacha-border p-2 font-body text-sm text-tacha-text has-[:checked]:border-tacha-teal">
              <input
                type="radio"
                name={MEAL_SLOT_FORM.RECIPE_FIELD_NAME}
                value={option.id}
                checked={selectedRecipeId === option.id}
                onChange={() => onRecipeChoose(option.id)}
              />
              <span className="flex-1">{option.name}</span>
              <span className="text-xs text-tacha-textsec">{option.servingsLabel}</span>
            </label>
          </li>
        ))}
      </ul>
    ) : null}
  </fieldset>
);

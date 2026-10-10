import { Button, Modal } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import { MEAL_SLOT_TEXT } from "../constants/meal-planner.constants";
import { MealSlotCookField } from "./MealSlotCookField";
import { MealSlotRecipeList } from "./MealSlotRecipeList";
import { MealSlotServingsField } from "./MealSlotServingsField";
import type { MealSlotDialogProps } from "./models/MealSlotDialogProps.type";

/**
 * Diálogo para asignar o cambiar la comida de un espacio: receta, cocinero y
 * multiplicador, con "Guardar", "Quitar" (solo si ya hay algo) y "Cancelar".
 * Solo presentación: qué pasa al elegir o guardar lo decide useMealSlotDialog.
 * Clic fuera y Escape cierran (comportamiento del Modal compartido), y el hook
 * no deja cerrar mientras guarda.
 */
export const MealSlotDialog = ({
  canDecreaseServings,
  canIncreaseServings,
  canSave,
  cookChoice,
  errorMessage,
  isAssigned,
  isOpen,
  isSaving,
  multiplierLabel,
  onClose,
  onCookChange,
  onMultiplierDecrease,
  onMultiplierIncrease,
  onRecipeChoose,
  onRecipesRetry,
  onRemove,
  onSave,
  recipeOptions,
  recipesStatus,
  selectedRecipeId,
  servingsSummary,
  subtitle,
  title,
}: MealSlotDialogProps): React.JSX.Element => (
  <Modal isOpen={isOpen} onClose={onClose} title={title}>
    <div className="flex flex-col gap-4">
      {subtitle ? <p className="font-body text-sm text-tacha-textsec">{subtitle}</p> : null}

      <MealSlotRecipeList
        isSaving={isSaving}
        onRecipeChoose={onRecipeChoose}
        onRecipesRetry={onRecipesRetry}
        recipeOptions={recipeOptions}
        recipesStatus={recipesStatus}
        selectedRecipeId={selectedRecipeId}
      />
      <MealSlotCookField cookChoice={cookChoice} isSaving={isSaving} onCookChange={onCookChange} />
      <MealSlotServingsField
        canDecreaseServings={canDecreaseServings}
        canIncreaseServings={canIncreaseServings}
        isSaving={isSaving}
        multiplierLabel={multiplierLabel}
        onMultiplierDecrease={onMultiplierDecrease}
        onMultiplierIncrease={onMultiplierIncrease}
        servingsSummary={servingsSummary}
      />

      {errorMessage ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {errorMessage}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {isAssigned ? (
            <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onRemove}>
              {MEAL_SLOT_TEXT.REMOVE}
            </Button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant={BUTTON_VARIANT.SECONDARY} isDisabled={isSaving} onClick={onClose}>
            {MEAL_SLOT_TEXT.CANCEL}
          </Button>
          <Button isDisabled={!canSave} onClick={onSave}>
            {isSaving ? MEAL_SLOT_TEXT.SAVING : MEAL_SLOT_TEXT.SAVE}
          </Button>
        </div>
      </div>
    </div>
  </Modal>
);

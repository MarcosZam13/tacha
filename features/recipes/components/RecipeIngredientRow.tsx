import { Button, Input } from "@/components/ui";
import { BUTTON_VARIANT } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";
import { RECIPE_EDITOR_TEXT, RECIPE_UNIT_OPTIONS } from "../constants/recipes.constants";
import type { RecipeIngredientRowProps } from "./models/RecipeIngredientRowProps.interface";

/**
 * Un ingrediente ya elegido: el producto no se escribe (CA-03), solo se le
 * asigna cantidad y unidad (CA-02). Solo presentación: cada control avisa el
 * cambio con el productId de su fila.
 *
 * La unidad usa un <select> nativo: es el único selector de la app todavía;
 * se promueve a components/ui cuando aparezca el segundo.
 */
export const RecipeIngredientRow = ({
  ingredient,
  onQuantityChange,
  onRemove,
  onUnitChange,
}: RecipeIngredientRowProps): React.JSX.Element => (
  <li className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-end">
    <p className="flex-1 font-body text-sm font-medium text-tacha-text sm:pb-2">{ingredient.productName}</p>
    <div className="sm:w-32">
      <Input
        label={RECIPE_EDITOR_TEXT.QUANTITY_LABEL}
        value={ingredient.quantity}
        onChange={(quantity) => onQuantityChange(ingredient.productId, quantity)}
        placeholder={RECIPE_EDITOR_TEXT.QUANTITY_PLACEHOLDER}
        errorMessage={ingredient.quantityError}
        isRequired
      />
    </div>
    <label className="flex flex-col gap-1 font-body text-sm sm:w-32">
      <span className="font-medium text-tacha-text">{RECIPE_EDITOR_TEXT.UNIT_LABEL}</span>
      <select
        value={ingredient.unit}
        // Los valores salen de RECIPE_UNIT_OPTIONS, así que siempre es una unidad válida.
        onChange={(event) => onUnitChange(ingredient.productId, event.target.value as CatalogBaseUnitType)}
        className="rounded-tacha-badge border border-tacha-border bg-tacha-surface px-3 py-2 text-tacha-text outline-none focus:ring-2 focus:ring-tacha-teal"
      >
        {RECIPE_UNIT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
    <Button variant={BUTTON_VARIANT.SECONDARY} onClick={() => onRemove(ingredient.productId)}>
      {RECIPE_EDITOR_TEXT.REMOVE_INGREDIENT}
    </Button>
  </li>
);

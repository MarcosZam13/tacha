import { Chip } from "@/components/ui";
import { CHIP_TONE } from "@/constants";
import type { RecipeCoverageIngredientProps } from "./models/RecipeCoverageIngredientProps.interface";

/**
 * Una fila del panel "Ver qué falta": ingrediente, cantidad y estado. Solo
 * presentación: los textos ya vienen armados desde utils/toCoverageIngredients.ts.
 * El estado se dice con texto ("Cubierto" / "Falta"), no solo con el color del chip.
 */
export const RecipeCoverageIngredient = ({ ingredient }: RecipeCoverageIngredientProps): React.JSX.Element => (
  <li className="flex items-start justify-between gap-3">
    <div className="flex flex-col">
      <span className="font-body text-sm text-tacha-text">{ingredient.name}</span>
      <span className="font-body text-xs text-tacha-textsec">{ingredient.quantityLabel}</span>
      {ingredient.reasonText ? <span className="font-body text-xs text-tacha-textsec">{ingredient.reasonText}</span> : null}
    </div>
    <Chip tone={ingredient.isCovered ? CHIP_TONE.TEAL : CHIP_TONE.TERRACOTTA}>{ingredient.statusLabel}</Chip>
  </li>
);

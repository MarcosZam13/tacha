import { Chip } from "@/components/ui";
import { CHIP_TONE } from "@/constants";
import {
  SHELF_LIFE_CHOICE_LABEL,
  SHELF_LIFE_CHOICE_ORDER,
  SHELF_LIFE_TEXT,
} from "../constants/shelf-life.constants";
import type { ShelfLifeChipsProps } from "./models/ShelfLifeChipsProps.interface";

/**
 * Chips de "cuánto le va a durar" debajo de la fila recién tachada (SCRUM-103,
 * HU-70b CA-01). Un toque, sin confirmar (CA-03); el elegido se marca con
 * aria-pressed y el color teal, como los chips de categoría del catálogo.
 * Si no caben en un renglón pasan al siguiente: los cuatro se ven siempre, sin
 * deslizar (con scroll horizontal, en el celular las opciones de la derecha
 * quedaban escondidas y no se veía que había más).
 */
export const ShelfLifeChips = ({ chips, productName }: ShelfLifeChipsProps): React.JSX.Element => (
  <div className="flex flex-col gap-1 px-3 pb-2">
    <p className="font-body text-xs text-tacha-textsec">{SHELF_LIFE_TEXT.HINT}</p>
    <div
      role="group"
      aria-label={`${SHELF_LIFE_TEXT.GROUP_LABEL_PREFIX} ${productName}${SHELF_LIFE_TEXT.GROUP_LABEL_SUFFIX}`}
      className="flex flex-wrap gap-2"
    >
      {SHELF_LIFE_CHOICE_ORDER.map((choice) => {
        const isSelected = chips.selectedChoice === choice;
        return (
          <button
            key={choice}
            type="button"
            className="shrink-0 disabled:cursor-wait"
            aria-pressed={isSelected}
            disabled={chips.isSaving}
            onClick={() => chips.onChoose(choice)}
          >
            <Chip tone={isSelected ? CHIP_TONE.TEAL : CHIP_TONE.NEUTRAL}>{SHELF_LIFE_CHOICE_LABEL[choice]}</Chip>
          </button>
        );
      })}
    </div>
    {chips.errorMessage ? (
      <p role="alert" className="font-body text-xs text-tacha-danger">
        {chips.errorMessage}
      </p>
    ) : null}
  </div>
);

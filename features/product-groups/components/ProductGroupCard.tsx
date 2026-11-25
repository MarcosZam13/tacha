import { Button, Chip } from "@/components/ui";
import { CHIP_TONE } from "@/constants";
import { PRODUCT_GROUP_ADD_TO_LIST_TEXT, PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";
import { ProductGroupAddToListResult } from "./ProductGroupAddToListResult";
import type { ProductGroupCardProps } from "./models/ProductGroupCardProps.interface";

/**
 * Tarjeta de un grupo (`group-card` de DESIGN.md §5): nombre, cuántos
 * productos tiene y si está compartido con la familia. Solo presentación:
 * el texto del conteo ya viene armado (utils/toProductGroupCards.ts).
 * "Agregar a lista" (HU-74, SCRUM-111) suma todos sus productos a la lista
 * de un toque; editar y eliminar llegan con HU-75/75b.
 *
 * Un nombre sin espacios (hasta 60 caracteres) no tiene dónde cortarse: sin
 * `min-w-0` la celda del grid no se achica por debajo del texto, y sin
 * `break-words` el nombre se sale de la tarjeta y la página scrollea de lado.
 */
export const ProductGroupCard = ({ addToList, group, onAddToList }: ProductGroupCardProps): React.JSX.Element => (
  <li className="min-w-0">
    <article className="flex h-full flex-col gap-2 rounded-tacha-card border border-tacha-border bg-tacha-surface p-4">
      <h2 className="break-words font-display text-xl font-semibold text-tacha-text">{group.name}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-body text-sm text-tacha-textsec">{group.countLabel}</p>
        {group.isShared ? <Chip tone={CHIP_TONE.TEAL}>{PRODUCT_GROUPS_TEXT.SHARED_BADGE}</Chip> : null}
      </div>
      <div className="mt-auto flex flex-col gap-2 pt-2">
        <Button isDisabled={addToList.isDisabled} onClick={() => onAddToList(group)}>
          <span aria-hidden="true">
            {addToList.isAdding ? PRODUCT_GROUP_ADD_TO_LIST_TEXT.ADDING : PRODUCT_GROUP_ADD_TO_LIST_TEXT.BUTTON}
          </span>
          {/* El nombre del grupo en el nombre accesible: no hay varios "Agregar a lista" iguales. */}
          <span className="sr-only">
            {`${PRODUCT_GROUP_ADD_TO_LIST_TEXT.BUTTON_LABEL_PREFIX}${group.name}${PRODUCT_GROUP_ADD_TO_LIST_TEXT.BUTTON_LABEL_SUFFIX}`}
          </span>
        </Button>
        {addToList.feedback ? <ProductGroupAddToListResult feedback={addToList.feedback} /> : null}
      </div>
    </article>
  </li>
);

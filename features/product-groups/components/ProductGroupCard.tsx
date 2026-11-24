import { Chip } from "@/components/ui";
import { CHIP_TONE } from "@/constants";
import { PRODUCT_GROUPS_TEXT } from "../constants/product-groups.constants";
import type { ProductGroupCardProps } from "./models/ProductGroupCardProps.interface";

/**
 * Tarjeta de un grupo (`group-card` de DESIGN.md §5): nombre, cuántos
 * productos tiene y si está compartido con la familia. Solo presentación:
 * el texto del conteo ya viene armado (utils/toProductGroupCards.ts).
 * Las acciones (agregar a lista, editar, eliminar) llegan con HU-74/75/75b.
 *
 * Un nombre sin espacios (hasta 60 caracteres) no tiene dónde cortarse: sin
 * `min-w-0` la celda del grid no se achica por debajo del texto, y sin
 * `break-words` el nombre se sale de la tarjeta y la página scrollea de lado.
 */
export const ProductGroupCard = ({ group }: ProductGroupCardProps): React.JSX.Element => (
  <li className="min-w-0">
    <article className="flex h-full flex-col gap-2 rounded-tacha-card border border-tacha-border bg-tacha-surface p-4">
      <h2 className="break-words font-display text-xl font-semibold text-tacha-text">{group.name}</h2>
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-body text-sm text-tacha-textsec">{group.countLabel}</p>
        {group.isShared ? <Chip tone={CHIP_TONE.TEAL}>{PRODUCT_GROUPS_TEXT.SHARED_BADGE}</Chip> : null}
      </div>
    </article>
  </li>
);

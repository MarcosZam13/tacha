import { CHIP_TONE } from "@/constants";
import { Chip } from "@/components/ui";
import { CATALOG_CATEGORY_CHIPS_TEXT } from "../constants/catalog-search.constants";
import type { CatalogCategoryChipsProps } from "./models/CatalogCategoryChipsProps.interface";

/**
 * Fila de chips de categoría (HU-52): "Todas" + una por categoría, con scroll
 * horizontal si no caben en una línea. Solo presentación: decide cuándo
 * llamar a onCategoryChange, nunca qué RPC usar (eso lo decide el
 * ViewModel). Tocar el chip ya activo, o "Todas", limpia el filtro.
 */
export const CatalogCategoryChips = ({
  activeCategoryId,
  categories,
  onCategoryChange,
}: CatalogCategoryChipsProps): React.JSX.Element => {
  const isAllActive = activeCategoryId === null;

  const toggleCategory = (categoryId: string | null): void => {
    onCategoryChange(activeCategoryId === categoryId ? null : categoryId);
  };

  return (
    <div
      role="group"
      aria-label={CATALOG_CATEGORY_CHIPS_TEXT.ARIA_LABEL}
      className="flex gap-2 overflow-x-auto"
    >
      <button type="button" className="shrink-0" aria-pressed={isAllActive} onClick={() => toggleCategory(null)}>
        <Chip tone={isAllActive ? CHIP_TONE.TEAL : CHIP_TONE.NEUTRAL}>
          {CATALOG_CATEGORY_CHIPS_TEXT.ALL_CATEGORIES_LABEL}
        </Chip>
      </button>
      {categories.map((category) => {
        const isActive = activeCategoryId === category.id;
        return (
          <button
            key={category.id}
            type="button"
            className="shrink-0"
            aria-pressed={isActive}
            onClick={() => toggleCategory(category.id)}
          >
            <Chip tone={isActive ? CHIP_TONE.TEAL : CHIP_TONE.NEUTRAL}>{category.name}</Chip>
          </button>
        );
      })}
    </div>
  );
};

import type { Category } from "@/types/catalog.types";

// Props de CatalogCategoryChips (HU-52).
export interface CatalogCategoryChipsProps {
  /** Categoría del chip activo; null = "Todas"/sin filtro. */
  activeCategoryId: string | null;
  categories: Category[];
  onCategoryChange: (categoryId: string | null) => void;
}

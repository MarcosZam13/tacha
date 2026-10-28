import type { NullableRef } from "@/types/nullable.types";
import type { CatalogCardData, Category } from "@/types/catalog.types";
import type { CatalogSearchStatusType } from "../constants/catalog-search.constants";

// Interfaces de la pantalla "Buscar" del catálogo (SCRUM-83/HU-51, SCRUM-84/HU-52).
// CatalogCardData vive en @/types/catalog.types porque la usan dos
// features desde SCRUM-86: "Buscar" y "Mis productos".

/** Lo que useCatalogSearchViewModel le entrega a CatalogSearch.tsx, ya calculado. */
export interface CatalogSearchViewModel {
  /** Categoría del chip activo (HU-52); null = "Todas"/sin filtro. */
  activeCategoryId: string | null;
  cards: CatalogCardData[];
  /** Filas de categories, para dibujar los chips (HU-52). */
  categories: Category[];
  errorMessage: NullableRef<string>;
  onCategoryChange: (categoryId: string | null) => void;
  onQueryChange: (query: string) => void;
  query: string;
  status: CatalogSearchStatusType;
}

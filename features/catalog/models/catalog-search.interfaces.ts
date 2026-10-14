import type { NullableRef } from "@/types/nullable.types";
import type { CatalogCardData } from "@/types/catalog.types";
import type { CatalogSearchStatusType } from "../constants/catalog-search.constants";

// Interfaces de la pantalla "Buscar" del catálogo (SCRUM-83).
// CatalogCardData vive en @/types/catalog.types porque la usan dos
// features desde SCRUM-86: "Buscar" y "Mis productos".

/** Lo que useCatalogSearchViewModel le entrega a CatalogSearch.tsx, ya calculado. */
export interface CatalogSearchViewModel {
  cards: CatalogCardData[];
  errorMessage: NullableRef<string>;
  onQueryChange: (query: string) => void;
  query: string;
  status: CatalogSearchStatusType;
}

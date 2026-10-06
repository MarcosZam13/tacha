import type { NullableRef } from "@/types/nullable.types";
import type { CatalogSearchStatusType } from "../constants/catalog-search.constants";

// Interfaces de la pantalla "Buscar" del catálogo (SCRUM-83).

/** Una tarjeta lista para dibujar: una variante (producto + tamaño), con los textos ya armados. */
export interface CatalogCardData {
  /** Id de la variante: es lo que identifica la tarjeta aunque cambie el orden de los resultados. */
  id: string;
  imageUrl: NullableRef<string>;
  /** Letra que se muestra cuando la variante no tiene foto. */
  placeholderInitial: string;
  /** "₡800 – ₡1 200", un solo precio si coinciden, o el aviso de que no hay precio. */
  priceLabel: string;
  /** "Leche — 1000 ml". Sin marca. */
  title: string;
}

/** Lo que useCatalogSearchViewModel le entrega a CatalogSearch.tsx, ya calculado. */
export interface CatalogSearchViewModel {
  cards: CatalogCardData[];
  errorMessage: NullableRef<string>;
  onQueryChange: (query: string) => void;
  query: string;
  status: CatalogSearchStatusType;
}

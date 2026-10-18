import type { NullableRef } from "@/types/nullable.types";

/**
 * Un integrante, listo para dibujar. El id del miembro solo es la key de
 * React: no llega al HTML. Ser admin sale del rol de la base, nunca del nombre
 * (cada usuario puede elegir su nombre).
 */
export interface HouseholdMemberRow {
  /** Iniciales del nombre, o null: se muestra un ícono genérico. */
  initials: NullableRef<string>;
  isAdmin: boolean;
  isCurrentUser: boolean;
  /** El nombre, o "Miembro sin nombre". Nunca el correo. */
  label: string;
  /** Solo para la key de React; no se dibuja. */
  rowKey: string;
}

/** La sección "Integrantes de la familia" (SCRUM-60), con todo resuelto por el ViewModel. */
export interface HouseholdMembersSectionProps {
  /** Cantidad cargada, para role="status" ("5 integrantes"); null mientras carga o con error. */
  countText: NullableRef<string>;
  /** Falló la primera página o la búsqueda: role="alert" y "Reintentar". */
  errorMessage: NullableRef<string>;
  hasMore: boolean;
  hasNoResults: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  /** Falló "Cargar más": la lista se conserva y el mismo botón reintenta. */
  loadMoreErrorMessage: NullableRef<string>;
  onLoadMore: () => void;
  onQueryChange: (query: string) => void;
  onRetry: () => void;
  query: string;
  rows: HouseholdMemberRow[];
}

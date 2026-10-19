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
  /**
   * Abre la confirmación para eliminar a esta persona (SCRUM-61), o null si no
   * corresponde: solo el admin lo tiene, y nunca en su propia fila ni en la de
   * un admin. El id de la persona queda en el closure, no en el HTML.
   */
  onRemoveRequest: NullableRef<() => void>;
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
  /**
   * Sube cuando la persona deja la lista después de confirmar (removed o
   * member_not_found): la fila ya no existe y el foco va al título de la
   * sección (SPEC §9, SCRUM-61). Cancelar no lo cambia.
   */
  titleFocusKey: number;
}

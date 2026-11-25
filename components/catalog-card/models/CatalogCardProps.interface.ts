import type { CatalogCardData } from "@/types/catalog.types";

export interface CatalogCardProps {
  /**
   * Botones propios de la pantalla (HU-58: "Editar"/"Eliminar" en "Mis
   * productos"). Se dibujan debajo de la tarjeta, fuera de su link: un botón
   * dentro de un link es HTML inválido y su clic también navegaría.
   */
  actions?: React.ReactNode;
  card: CatalogCardData;
}

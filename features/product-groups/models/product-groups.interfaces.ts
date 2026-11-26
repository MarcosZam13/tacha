import type { NullableRef } from "@/types/nullable.types";
import type { ProductGroupCardAddToList } from "./product-group-list-addition.interfaces";
import type { ProductGroupsStatusType } from "../constants/product-groups.constants";

// Interfaces de la pantalla "Mis grupos" (SCRUM-109 / HU-72).

/** Un grupo ya adaptado para la tarjeta: sin nombres de columnas de la base. */
export interface ProductGroupSummary {
  id: string;
  /** Compartido con la familia (household_id no nulo). */
  isShared: boolean;
  name: string;
  /** Cuántas presentaciones tiene el grupo (cada una cuenta una vez). */
  productCount: number;
}

/** Última respuesta del servicio, guardada por el ViewModel. */
export interface ProductGroupsResponse {
  errorMessage: NullableRef<string>;
  groups: ProductGroupSummary[];
}

/** Lo que useProductGroupsViewModel le entrega a ProductGroups.tsx, ya calculado. */
export interface ProductGroupsViewModel {
  errorMessage: NullableRef<string>;
  /** SCRUM-111: estado de "Agregar a lista" para la tarjeta de ese grupo. */
  getGroupAddToList: (groupId: string) => ProductGroupCardAddToList;
  groups: ProductGroupCardData[];
  /** SCRUM-111: el grupo que se quiso agregar ya no existe (aviso de pantalla). */
  missingGroupNotice: NullableRef<string>;
  onAddToList: (group: ProductGroupCardData) => void;
  /** Vuelve a pedir los grupos (botón "Reintentar"). */
  reload: () => void;
  status: ProductGroupsStatusType;
}

/** Datos de una tarjeta, con el texto del conteo ya armado. */
export interface ProductGroupCardData {
  countLabel: string;
  id: string;
  isShared: boolean;
  name: string;
}

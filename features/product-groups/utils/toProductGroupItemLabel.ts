import { CATALOG_CARD } from "@/constants";

/**
 * "Leche — 1 L": cómo se nombra una fila del grupo, igual que las tarjetas
 * del catálogo. Lo usan los anuncios del editor y los nombres accesibles de
 * "Quitar" y del stepper, para que no haya varios "Quitar" iguales.
 */
export const toProductGroupItemLabel = (item: { productName: string; sizeLabel: string }): string =>
  `${item.productName}${CATALOG_CARD.TITLE_SEPARATOR}${item.sizeLabel}`;

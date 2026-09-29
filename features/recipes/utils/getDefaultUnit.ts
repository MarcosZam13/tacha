import { CATALOG_BASE_UNIT } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";
import type { CatalogProduct } from "@/types/catalog.types";

/**
 * Unidad que se preselecciona al elegir un ingrediente: la de sus
 * presentaciones en el catálogo (leche → ml). Todas las variantes de un
 * producto madre comparten unidad base, así que basta con la primera. Si no
 * tiene variantes, se cuenta por unidades. El usuario la puede cambiar.
 */
export const getDefaultUnit = (product: CatalogProduct): CatalogBaseUnitType =>
  product.variants[0]?.baseUnit ?? CATALOG_BASE_UNIT.UNIT;

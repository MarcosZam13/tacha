import { CATALOG_BASE_UNIT_LABEL } from "../constants/shopping-list.constants";
import type { CatalogBaseUnitType } from "../constants/shopping-list.constants";

/** 275 + "g" → "275 g"; 1000 + "ml" → "1000 ml". */
export const formatSizeLabel = (baseQuantity: number, baseUnit: CatalogBaseUnitType): string =>
  `${baseQuantity} ${CATALOG_BASE_UNIT_LABEL[baseUnit]}`;

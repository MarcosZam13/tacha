import { PRODUCT_GROUP_COUNT_LABEL } from "../constants/product-groups.constants";
import type { ProductGroupCardData, ProductGroupSummary } from "../models/product-groups.interfaces";

/** "1 producto" / "8 productos". */
const toCountLabel = (productCount: number): string =>
  `${productCount} ${productCount === 1 ? PRODUCT_GROUP_COUNT_LABEL.SINGULAR : PRODUCT_GROUP_COUNT_LABEL.PLURAL}`;

/** Adapta los grupos de la base a lo que dibuja cada tarjeta. */
export const toProductGroupCards = (groups: ProductGroupSummary[]): ProductGroupCardData[] =>
  groups.map((group) => ({
    countLabel: toCountLabel(group.productCount),
    id: group.id,
    isShared: group.isShared,
    name: group.name,
  }));

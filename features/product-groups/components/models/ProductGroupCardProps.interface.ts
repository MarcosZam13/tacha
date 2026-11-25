import type { ProductGroupCardAddToList } from "../../models/product-group-list-addition.interfaces";
import type { ProductGroupCardData } from "../../models/product-groups.interfaces";

export interface ProductGroupCardProps {
  addToList: ProductGroupCardAddToList;
  group: ProductGroupCardData;
  onAddToList: (group: ProductGroupCardData) => void;
}

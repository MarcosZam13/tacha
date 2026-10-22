import type { NullableRef } from "@/types/nullable.types";

export interface ProductDetailHeaderProps {
  imageUrl: NullableRef<string>;
  placeholderInitial: string;
  productName: string;
  sizeLabel: string;
}

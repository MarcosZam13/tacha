import type { NullableRef } from "@/types/nullable.types";
import type { ProductSearchOption } from "./ProductSearchOption.interface";

export interface ProductSearchProps {
  errorMessage: NullableRef<string>;
  hasNoResults: boolean;
  isSearching: boolean;
  onQueryChange: (query: string) => void;
  onSelectOption: (optionId: string) => void;
  options: ProductSearchOption[];
  query: string;
}

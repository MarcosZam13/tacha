import type { NullableRef } from "@/types/nullable.types";
import type { CatalogSearchResult } from "../../models/CatalogSearchResult.interface";

export interface ProductSearchProps {
  errorMessage: NullableRef<string>;
  hasNoResults: boolean;
  isSearching: boolean;
  onQueryChange: (query: string) => void;
  onSelectResult: (searchResult: CatalogSearchResult) => void;
  query: string;
  results: CatalogSearchResult[];
}

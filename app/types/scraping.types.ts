import type { ScrapingSourceType, StoreSlug } from "@/app/constants";

export interface EdgeFunctionIngestRequest {
  query: string;
}

export interface EdgeFunctionIngestResponse {
  source: ScrapingSourceType;
  store: StoreSlug;
  query: string;
  stagedCount: number;
  warning?: string;
}

export interface EdgeFunctionErrorResponse {
  error: string;
  statusCode?: number;
}

export interface StagingProduct {
  id: string;
  store_id: string;
  scraped_name: string | null;
  scraped_brand: string | null;
  scraped_size_text: string | null;
  image_url: string | null;
  status: "pending" | "matched" | "rejected";
  scraped_at: string;
}

export interface ScrapingSearchState {
  query: string;
  selectedStore: StoreSlug;
  result: EdgeFunctionIngestResponse | null;
  isLoading: boolean;
  error: string | null;
  stagingRows: StagingProduct[];
  showStagingTable: boolean;
}

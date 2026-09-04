import { useState } from "react";
import type {
  EdgeFunctionErrorResponse,
  EdgeFunctionIngestResponse,
  StagingProduct,
  ScrapingSearchState,
} from "@/app/types/scraping.types";
import {
  EDGE_FUNCTION,
  SCRAPING_DEMO,
  STORE_NAMES,
  SUPABASE_REST,
  type StoreSlug,
} from "@/app/constants";

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

interface UseScrapingDemoViewModelReturn {
  state: ScrapingSearchState;
  handleSearch: () => Promise<void>;
  handleStoreChange: (store: StoreSlug) => void;
  handleQueryChange: (query: string) => void;
  handleToggleStagingTable: () => void;
  resetError: () => void;
}

export const useScrapingDemoViewModel = (): UseScrapingDemoViewModelReturn => {
  const [state, setState] = useState<ScrapingSearchState>({
    query: "",
    selectedStore: STORE_NAMES.MAXIPALI,
    result: null,
    isLoading: false,
    error: null,
    stagingRows: [],
    showStagingTable: false,
  });

  const handleSearch = async (): Promise<void> => {
    if (state.query.trim().length < SCRAPING_DEMO.QUERY_MIN_LENGTH) {
      setState((prev) => ({
        ...prev,
        error: `Query debe tener al menos ${SCRAPING_DEMO.QUERY_MIN_LENGTH} caracteres`,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      result: null,
      stagingRows: [],
      showStagingTable: false,
    }));

    try {
      const endpoint = `${EDGE_FUNCTION.BASE_URL}/ingest-${state.selectedStore}`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ query: state.query }),
      });

      const data = (await response.json()) as
        | EdgeFunctionIngestResponse
        | EdgeFunctionErrorResponse;

      if (!response.ok) {
        const errorData = data as EdgeFunctionErrorResponse;
        setState((prev) => ({
          ...prev,
          error: errorData.error || `Error ${response.status}`,
          isLoading: false,
        }));
        return;
      }

      const resultData = data as EdgeFunctionIngestResponse;
      setState((prev) => ({
        ...prev,
        result: resultData,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setState((prev) => ({
        ...prev,
        error: `Error de conexión: ${errorMessage}`,
        isLoading: false,
      }));
    }
  };

  const handleStoreChange = (store: StoreSlug): void => {
    setState((prev) => ({
      ...prev,
      selectedStore: store,
      result: null,
      error: null,
      stagingRows: [],
      showStagingTable: false,
    }));
  };

  const handleQueryChange = (query: string): void => {
    setState((prev) => ({
      ...prev,
      query,
    }));
  };

  const handleToggleStagingTable = async (): Promise<void> => {
    if (!state.result) return;

    if (state.showStagingTable) {
      setState((prev) => ({
        ...prev,
        showStagingTable: false,
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isLoading: true,
    }));

    try {
      if (!ANON_KEY) {
        throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY no configurado");
      }

      // FIX QA bugs #4 y #5 (2026-09-04): antes se hacía GET directo a
      // product_catalog_staging con la anon key — esa tabla es intencionalmente
      // privada (sin policy de SELECT, ver schema.sql), así que esa llamada
      // nunca podía funcionar. Ahora se usa la RPC get_recent_staging
      // (supabase/migrations/003_add_get_recent_staging_rpc.sql), que expone
      // solo las columnas necesarias para este demo sin abrir RLS de la tabla
      // ni exponer raw_json. De paso, la URL ya no está hardcodeada
      // (SUPABASE_REST.BASE_URL viene de NEXT_PUBLIC_SUPABASE_URL).
      // Nota: también corrige un bug de filtro — antes se comparaba
      // "store_id=eq.<slug>" (comparando un uuid contra un slug de texto,
      // que nunca hubiera matcheado ninguna fila); get_recent_staging recibe
      // el slug directamente y resuelve el join internamente.
      const response = await fetch(`${SUPABASE_REST.BASE_URL}/rpc/get_recent_staging`, {
        method: "POST",
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          store_slug: state.result.store,
          row_limit: SCRAPING_DEMO.STAGING_TABLE_ROWS_LIMIT,
        }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status} al consultar staging`);
      }

      const rows = (await response.json()) as StagingProduct[];
      setState((prev) => ({
        ...prev,
        stagingRows: rows,
        showStagingTable: true,
        isLoading: false,
      }));
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setState((prev) => ({
        ...prev,
        error: `Error al cargar staging: ${errorMessage}`,
        isLoading: false,
      }));
    }
  };

  const resetError = (): void => {
    setState((prev) => ({
      ...prev,
      error: null,
    }));
  };

  return {
    state,
    handleSearch,
    handleStoreChange,
    handleQueryChange,
    handleToggleStagingTable,
    resetError,
  };
};

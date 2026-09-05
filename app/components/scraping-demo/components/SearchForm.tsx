"use client";

import type { StoreSlug } from "@/app/constants";
import { STORE_DISPLAY, STORE_NAMES } from "@/app/constants";

interface SearchFormProps {
  query: string;
  selectedStore: StoreSlug;
  isLoading: boolean;
  onQueryChange: (query: string) => void;
  onStoreChange: (store: StoreSlug) => void;
  onSearch: () => void;
}

export const SearchForm = ({
  query,
  selectedStore,
  isLoading,
  onQueryChange,
  onStoreChange,
  onSearch,
}: SearchFormProps): JSX.Element => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      onSearch();
    }
  };

  return (
    <div className="space-y-4 border border-gray-300 rounded-lg p-6 bg-gray-50">
      <div className="space-y-2">
        <label htmlFor="query" className="block text-sm font-medium text-gray-900">
          Buscar producto:
        </label>
        <input
          id="query"
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ej. leche"
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor="store" className="block text-sm font-medium text-gray-900">
          Tienda:
        </label>
        <select
          id="store"
          value={selectedStore}
          onChange={(e) => onStoreChange(e.target.value as StoreSlug)}
          disabled={isLoading}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        >
          <option value={STORE_NAMES.MAXIPALI}>
            {STORE_DISPLAY.maxipali}
          </option>
          <option value={STORE_NAMES.WALMART}>
            {STORE_DISPLAY.walmart}
          </option>
          <option value={STORE_NAMES.MASXMENOS}>
            {STORE_DISPLAY.masxmenos}
          </option>
        </select>
      </div>

      <button
        onClick={onSearch}
        disabled={isLoading || query.trim().length === 0}
        className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
      >
        {isLoading ? "Buscando..." : "Buscar"}
      </button>
    </div>
  );
};

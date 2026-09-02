"use client";

import { useScrapingDemoViewModel } from "./hooks/useScrapingDemoViewModel";
import { SearchForm } from "./components/SearchForm";
import { ResultsDisplay } from "./components/ResultsDisplay";
import { StagingTable } from "./components/StagingTable";

export const ScrapingDemoInner = (): JSX.Element => {
  const {
    state,
    handleSearch,
    handleStoreChange,
    handleQueryChange,
    handleToggleStagingTable,
    resetError,
  } = useScrapingDemoViewModel();

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-gray-900">Demo: Ingesta Scraping</h1>
        <p className="text-gray-700">
          Demuestra el comportamiento cache-first de las Edge Functions de
          scraping. Primera búsqueda = en vivo, segunda búsqueda igual dentro
          de 6 horas = desde cache.
        </p>
      </div>

      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-3 rounded-md">
          <p className="font-medium">Error:</p>
          <p>{state.error}</p>
          <button
            onClick={resetError}
            className="mt-2 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
          >
            Descartar
          </button>
        </div>
      )}

      <SearchForm
        query={state.query}
        selectedStore={state.selectedStore}
        isLoading={state.isLoading}
        onQueryChange={handleQueryChange}
        onStoreChange={handleStoreChange}
        onSearch={handleSearch}
      />

      <ResultsDisplay
        result={state.result}
        isLoading={state.isLoading}
        onViewStagingClick={handleToggleStagingTable}
      />

      {state.showStagingTable && (
        <StagingTable rows={state.stagingRows} isLoading={state.isLoading} />
      )}
    </div>
  );
};

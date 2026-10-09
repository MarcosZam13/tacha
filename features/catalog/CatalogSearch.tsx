"use client";

import { Input, Spinner } from "@/components/ui";
import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { CatalogCard } from "./components/CatalogCard";
import { CatalogEmptyState } from "./components/CatalogEmptyState";
import { CatalogTabs } from "./components/CatalogTabs";
import {
  CATALOG_SEARCH_STATUS,
  CATALOG_TAB,
  CATALOG_TEXT,
} from "./constants/catalog-search.constants";
import { useCatalogSearchViewModel } from "./hooks/useCatalogSearchViewModel";

/**
 * Sub-tab "Buscar" de la sección Catálogo. "use client" porque usa hooks y
 * habla con Supabase desde el navegador (la sesión vive en el navegador).
 */
export const CatalogSearch = (): React.JSX.Element => {
  const viewModel = useCatalogSearchViewModel();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      <h1 className="font-display text-3xl font-bold text-tacha-text">{CATALOG_TEXT.TITLE}</h1>
      <CatalogTabs activeTab={CATALOG_TAB.SEARCH} />

      <Input
        label={PRODUCT_SEARCH_TEXT.LABEL}
        value={viewModel.query}
        onChange={viewModel.onQueryChange}
        placeholder={PRODUCT_SEARCH_TEXT.PLACEHOLDER}
      />

      {viewModel.status === CATALOG_SEARCH_STATUS.IDLE ? (
        <p className="font-body text-sm text-tacha-textsec">{CATALOG_TEXT.IDLE_HINT}</p>
      ) : null}
      {viewModel.status === CATALOG_SEARCH_STATUS.LOADING ? (
        <Spinner label={CATALOG_TEXT.SEARCHING} />
      ) : null}
      {viewModel.status === CATALOG_SEARCH_STATUS.ERROR ? (
        <p role="alert" className="font-body text-sm text-red-600">
          {viewModel.errorMessage}
        </p>
      ) : null}
      {viewModel.status === CATALOG_SEARCH_STATUS.EMPTY ? <CatalogEmptyState /> : null}
      {viewModel.status === CATALOG_SEARCH_STATUS.READY ? (
        <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {viewModel.cards.map((card) => (
            <CatalogCard key={card.id} card={card} />
          ))}
        </ul>
      ) : null}
    </div>
  );
};

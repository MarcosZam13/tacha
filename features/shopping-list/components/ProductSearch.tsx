import { Input, Spinner } from "@/components/ui";
import { SPINNER_SIZE } from "@/constants";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ProductSearchProps } from "./models/ProductSearchProps.interface";

/** Barra de búsqueda + resultados. Solo presentación: el texto y los resultados vienen del ViewModel. */
export const ProductSearch = ({
  errorMessage,
  hasNoResults,
  isSearching,
  onQueryChange,
  onSelectResult,
  query,
  results,
}: ProductSearchProps): React.JSX.Element => (
  <section className="flex flex-col gap-2">
    <Input
      label={SHOPPING_LIST_TEXT.SEARCH_LABEL}
      value={query}
      onChange={onQueryChange}
      placeholder={SHOPPING_LIST_TEXT.SEARCH_PLACEHOLDER}
      errorMessage={errorMessage ?? undefined}
    />
    {isSearching ? <Spinner size={SPINNER_SIZE.SMALL} /> : null}
    {hasNoResults ? (
      <p className="font-body text-sm text-tacha-textsec">{SHOPPING_LIST_TEXT.NO_RESULTS}</p>
    ) : null}
    {results.length > 0 ? (
      <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-badge border border-tacha-border bg-tacha-surface">
        {results.map((result) => (
          // key = variantId: identifica la variante aunque cambie el orden de los resultados.
          <li key={result.variantId}>
            <button
              type="button"
              onClick={() => onSelectResult(result)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-body text-sm text-tacha-text hover:bg-tacha-chipbg/40"
            >
              <span>{result.productName}</span>
              <span className="shrink-0 text-xs text-tacha-textsec">{result.sizeLabel}</span>
            </button>
          </li>
        ))}
      </ul>
    ) : null}
  </section>
);

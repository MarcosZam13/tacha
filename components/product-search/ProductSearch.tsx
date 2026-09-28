import { Input, Spinner } from "@/components/ui";
import { PRODUCT_SEARCH_TEXT, SPINNER_SIZE } from "@/constants";
import type { ProductSearchProps } from "./models/ProductSearchProps.interface";

/**
 * Barra de búsqueda del catálogo + resultados. Solo presentación: el texto
 * y las opciones vienen del ViewModel de cada feature, que decide qué es
 * cada opción (una variante, un producto madre) y qué pasa al elegirla.
 */
export const ProductSearch = ({
  errorMessage,
  hasNoResults,
  isSearching,
  onQueryChange,
  onSelectOption,
  options,
  query,
}: ProductSearchProps): React.JSX.Element => (
  <section className="flex flex-col gap-2">
    <Input
      label={PRODUCT_SEARCH_TEXT.LABEL}
      value={query}
      onChange={onQueryChange}
      placeholder={PRODUCT_SEARCH_TEXT.PLACEHOLDER}
      errorMessage={errorMessage ?? undefined}
    />
    {isSearching ? <Spinner size={SPINNER_SIZE.SMALL} /> : null}
    {hasNoResults ? (
      <p className="font-body text-sm text-tacha-textsec">{PRODUCT_SEARCH_TEXT.NO_RESULTS}</p>
    ) : null}
    {options.length > 0 ? (
      <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-badge border border-tacha-border bg-tacha-surface">
        {options.map((option) => (
          // key = id: identifica la opción aunque cambie el orden de los resultados.
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onSelectOption(option.id)}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left font-body text-sm text-tacha-text hover:bg-tacha-chipbg/40"
            >
              <span>{option.label}</span>
              {option.detail ? <span className="shrink-0 text-xs text-tacha-textsec">{option.detail}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    ) : null}
  </section>
);

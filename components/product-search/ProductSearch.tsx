import { Input, Spinner } from "@/components/ui";
import { PRODUCT_SEARCH_TEXT, SPINNER_SIZE } from "@/constants";
import { useProductSearchCombobox } from "./hooks/useProductSearchCombobox";
import type { ProductSearchProps } from "./models/ProductSearchProps.interface";

/**
 * Barra de búsqueda del catálogo + resultados. Las opciones vienen del
 * ViewModel de cada feature, que decide qué es cada opción (una variante, un
 * producto madre) y qué pasa al elegirla.
 *
 * Desde SCRUM-149 los resultados salen en un panel flotante pegado al campo:
 * tapa la lista en vez de empujarla hacia abajo, tiene alto máximo con scroll
 * propio y muestra como mucho PRODUCT_SEARCH.MAX_VISIBLE_RESULTS. La lógica
 * de abrir, cerrar y moverse con el teclado vive en useProductSearchCombobox.
 */
export const ProductSearch = ({
  errorMessage,
  hasNoResults,
  isSearching,
  onQueryChange,
  onSelectOption,
  options,
  query,
}: ProductSearchProps): React.JSX.Element => {
  const combobox = useProductSearchCombobox({
    hasPanelContent: isSearching || hasNoResults || options.length > 0,
    onQueryChange,
    onSelectOption,
    options,
  });

  return (
    <section className="relative">
      <Input
        label={PRODUCT_SEARCH_TEXT.LABEL}
        value={query}
        onChange={combobox.onInputChange}
        onBlur={combobox.onInputBlur}
        placeholder={PRODUCT_SEARCH_TEXT.PLACEHOLDER}
        errorMessage={errorMessage ?? undefined}
        combobox={combobox.combobox}
      />
      {combobox.isOpen ? (
        <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-tacha-badge border border-tacha-border bg-tacha-surface shadow-lg">
          {isSearching ? (
            <div className="flex justify-center p-3">
              <Spinner size={SPINNER_SIZE.SMALL} />
            </div>
          ) : null}
          {hasNoResults ? (
            <p className="px-3 py-2 font-body text-sm text-tacha-textsec">{PRODUCT_SEARCH_TEXT.NO_RESULTS}</p>
          ) : null}
          {combobox.visibleOptions.length > 0 ? (
            <ul
              id={combobox.listboxId}
              role="listbox"
              aria-label={PRODUCT_SEARCH_TEXT.RESULTS_LABEL}
              className="max-h-[min(20rem,45vh)] divide-y divide-tacha-border overflow-y-auto"
            >
              {combobox.visibleOptions.map((option, index) => {
                const isActive = index === combobox.activeIndex;
                return (
                  // key = id: identifica la opción aunque cambie el orden de los resultados.
                  // onMouseDown con preventDefault: el campo no pierde el foco (su blur
                  // cerraría el panel antes del click) y se sigue pudiendo escribir.
                  <li
                    key={option.id}
                    id={combobox.getOptionId(index)}
                    role="option"
                    aria-selected={isActive}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => combobox.onOptionPointerSelect(option.id)}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 font-body text-sm text-tacha-text ${
                      isActive ? "bg-tacha-chipbg" : "hover:bg-tacha-chipbg/50"
                    }`}
                  >
                    <span>{option.label}</span>
                    {option.detail ? <span className="shrink-0 text-xs text-tacha-textsec">{option.detail}</span> : null}
                  </li>
                );
              })}
            </ul>
          ) : null}
          {combobox.hasMoreResults ? (
            <p className="border-t border-tacha-border px-3 py-2 font-body text-xs text-tacha-textsec">
              {PRODUCT_SEARCH_TEXT.MORE_RESULTS_HINT}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

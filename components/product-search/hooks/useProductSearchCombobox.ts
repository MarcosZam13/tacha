import { useId, useState } from "react";
import { PRODUCT_SEARCH, PRODUCT_SEARCH_KEY } from "@/constants";
import type { InputComboboxAttributes } from "@/components/ui/input/models/InputProps.interface";
import type { ProductSearchOption } from "../models/ProductSearchOption.interface";

// Sin opción activa: el foco del teclado sigue en el texto.
const NO_ACTIVE_INDEX = -1;

interface UseProductSearchComboboxParams {
  /** Hay algo que mostrar en el panel: resultados, "buscando" o "sin resultados". */
  hasPanelContent: boolean;
  onQueryChange: (query: string) => void;
  onSelectOption: (optionId: string) => void;
  options: ProductSearchOption[];
}

interface UseProductSearchComboboxReturn {
  activeIndex: number;
  /** Atributos del campo de texto: rol combobox, aria-* y teclado. */
  combobox: InputComboboxAttributes;
  getOptionId: (index: number) => string;
  hasMoreResults: boolean;
  isOpen: boolean;
  listboxId: string;
  onInputBlur: () => void;
  onInputChange: (query: string) => void;
  onOptionPointerSelect: (optionId: string) => void;
  visibleOptions: ProductSearchOption[];
}

/**
 * Lógica del desplegable de resultados (SCRUM-149), separada del dibujo para
 * poder probarla sola. Sigue el patrón combobox + listbox de WAI-ARIA: el foco
 * se queda siempre en el campo de texto y la opción "activa" se anuncia con
 * aria-activedescendant, así se puede seguir escribiendo mientras se elige.
 *
 * - Se abre al enfocar o escribir; se cierra con Escape, al salir del campo o
 *   al elegir una opción.
 * - Muestra como máximo PRODUCT_SEARCH.MAX_VISIBLE_RESULTS; con más, avisa.
 * - Flechas mueven la opción activa (sin dar la vuelta), Enter la elige.
 */
export const useProductSearchCombobox = ({
  hasPanelContent,
  onQueryChange,
  onSelectOption,
  options,
}: UseProductSearchComboboxParams): UseProductSearchComboboxReturn => {
  const listboxId = useId();
  const [isPanelRequested, setIsPanelRequested] = useState(false);
  const [activeIndex, setActiveIndex] = useState(NO_ACTIVE_INDEX);

  const visibleOptions = options.slice(0, PRODUCT_SEARCH.MAX_VISIBLE_RESULTS);
  const isOpen = isPanelRequested && hasPanelContent;
  // Si llegaron menos resultados que antes, la activa no puede quedar fuera de la lista.
  const safeActiveIndex = activeIndex < visibleOptions.length ? activeIndex : NO_ACTIVE_INDEX;

  const getOptionId = (index: number): string => `${listboxId}-opcion-${index}`;

  const close = (): void => {
    setIsPanelRequested(false);
    setActiveIndex(NO_ACTIVE_INDEX);
  };

  const select = (optionId: string): void => {
    close();
    onSelectOption(optionId);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case PRODUCT_SEARCH_KEY.ARROW_DOWN:
        // preventDefault: si no, la flecha mueve el cursor dentro del texto.
        event.preventDefault();
        setIsPanelRequested(true);
        setActiveIndex(Math.min(safeActiveIndex + 1, visibleOptions.length - 1));
        return;
      case PRODUCT_SEARCH_KEY.ARROW_UP:
        event.preventDefault();
        // Sin opción activa no hay a dónde subir; desde la primera se queda ahí.
        setActiveIndex(safeActiveIndex === NO_ACTIVE_INDEX ? NO_ACTIVE_INDEX : Math.max(safeActiveIndex - 1, 0));
        return;
      case PRODUCT_SEARCH_KEY.ENTER:
        if (isOpen && safeActiveIndex !== NO_ACTIVE_INDEX) {
          // Sin preventDefault un Enter dentro de un <form> (recetas) lo enviaría.
          event.preventDefault();
          select(visibleOptions[safeActiveIndex].id);
        }
        return;
      case PRODUCT_SEARCH_KEY.ESCAPE:
        close();
        return;
      default:
    }
  };

  return {
    activeIndex: safeActiveIndex,
    combobox: {
      "aria-activedescendant": isOpen && safeActiveIndex !== NO_ACTIVE_INDEX ? getOptionId(safeActiveIndex) : undefined,
      "aria-autocomplete": "list",
      "aria-controls": listboxId,
      "aria-expanded": isOpen,
      onFocus: () => setIsPanelRequested(true),
      onKeyDown,
      role: "combobox",
    },
    getOptionId,
    hasMoreResults: options.length > visibleOptions.length,
    isOpen,
    listboxId,
    onInputBlur: close,
    onInputChange: (query: string) => {
      setIsPanelRequested(true);
      setActiveIndex(NO_ACTIVE_INDEX);
      onQueryChange(query);
    },
    onOptionPointerSelect: select,
    visibleOptions,
  };
};

import { fireEvent, screen } from "@testing-library/react";
import { PRODUCT_SEARCH_TEXT } from "@/constants";

/** Page Object del buscador de productos (SCRUM-149). */
export const createProductSearchPage = () => {
  const getCombobox = (): HTMLElement => screen.getByRole("combobox", { name: PRODUCT_SEARCH_TEXT.LABEL });
  const queryListbox = (): HTMLElement | null => screen.queryByRole("listbox", { name: PRODUCT_SEARCH_TEXT.RESULTS_LABEL });
  const getOptions = (): HTMLElement[] => screen.queryAllByRole("option");
  const queryMoreResultsHint = (): HTMLElement | null => screen.queryByText(PRODUCT_SEARCH_TEXT.MORE_RESULTS_HINT);

  const type = (text: string): void => {
    fireEvent.focus(getCombobox());
    fireEvent.change(getCombobox(), { target: { value: text } });
  };
  const pressKey = (key: string): void => {
    fireEvent.keyDown(getCombobox(), { key });
  };
  const blur = (): void => {
    fireEvent.blur(getCombobox());
  };

  return { blur, getCombobox, getOptions, pressKey, queryListbox, queryMoreResultsHint, type };
};

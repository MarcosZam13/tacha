import { screen, within } from "@testing-library/react";
import { FINANCE_TEXT } from "../constants/finance.constants";

/**
 * Page Object de "Gasto por supermercado" (SCRUM-72), suelto o dentro del
 * Dashboard. Sin aserciones: las hace el test.
 */
export const createSpendingByStorePage = () => {
  // La sección se nombra con su título (SPEC §9).
  const getSection = () => screen.getByRole("region", { name: FINANCE_TEXT.STORE_SPENDING_TITLE });
  const findSection = () => screen.findByRole("region", { name: FINANCE_TEXT.STORE_SPENDING_TITLE });
  const querySection = () => screen.queryByRole("region", { name: FINANCE_TEXT.STORE_SPENDING_TITLE });
  const getTitle = () => within(getSection()).getByRole("heading", { level: 2, name: FINANCE_TEXT.STORE_SPENDING_TITLE });

  // La lista: un elemento por supermercado, en el orden en que se ve.
  const getList = () => within(getSection()).getByRole("list", { name: FINANCE_TEXT.STORE_SPENDING_TITLE });
  const getRows = () => within(getList()).getAllByRole("listitem");
  const getRowTexts = () => getRows().map((row) => row.textContent);
  const getRowText = (row: HTMLElement, text: string | RegExp) => within(row).getByText(text);

  // Lo que está en la sección pero fuera de la lista (el ajuste, D45).
  const querySectionText = (text: string | RegExp) => within(getSection()).queryByText(text);
  const queryListText = (text: string | RegExp) => within(getList()).queryByText(text);
  const queryLinksAndButtons = () => [
    ...within(getSection()).queryAllByRole("link"),
    ...within(getSection()).queryAllByRole("button"),
  ];

  return {
    findSection,
    getList,
    getRowText,
    getRowTexts,
    getRows,
    getSection,
    getTitle,
    queryLinksAndButtons,
    queryListText,
    querySection,
    querySectionText,
  };
};

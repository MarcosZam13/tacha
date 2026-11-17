import { screen } from "@testing-library/react";
import { formatColones } from "@/features/finance/utils/formatColones";
import userEvent from "@testing-library/user-event";
import { DATE_LIST_TEXT } from "../constants/date-lists.constants";

/** Page Object del detalle de una sublista: los tests no consultan el DOM directamente. */
export const createDateListDetailPage = () => {
  const user = userEvent.setup();

  return {
    clickCancelList: () => user.click(screen.getByRole("button", { name: DATE_LIST_TEXT.CANCEL_LIST })),
    clickConfirmCancel: () => user.click(screen.getByRole("button", { name: DATE_LIST_TEXT.CANCEL_CONFIRM })),
    clickKeepList: () => user.click(screen.getByRole("button", { name: DATE_LIST_TEXT.CANCEL_KEEP })),
    clickReactivate: () => user.click(screen.getByRole("button", { name: DATE_LIST_TEXT.REACTIVATE })),
    clickToggle: (productName: string) =>
      user.click(screen.getByRole("checkbox", { name: `${DATE_LIST_TEXT.CHECK_ITEM} ${productName}` })),
    findAlert: () => screen.findByRole("alert"),
    findStatus: (statusLabel: string) => screen.findByText(new RegExp(`· ${statusLabel}$`)),
    findTitle: (title: string) => screen.findByRole("heading", { name: title }),
    getCheckbox: (productName: string) =>
      screen.getByRole("checkbox", { name: `${DATE_LIST_TEXT.CHECK_ITEM} ${productName}` }),
    getCheckboxes: () => screen.getAllByRole("checkbox"),
    clickEditTotal: () => user.click(screen.getByRole("button", { name: DATE_LIST_TEXT.TOTAL_EDIT })),
    clickSaveTotal: () => user.click(screen.getByRole("button", { name: DATE_LIST_TEXT.TOTAL_SAVE })),
    // Intl separa los miles con un espacio duro; sin normalizar, se compara tal como se dibuja.
    findTotal: (amount: number) => screen.findByText(formatColones(amount), { normalizer: (text) => text.trim() }),
    getTotal: (amount: number) => screen.getByText(formatColones(amount), { normalizer: (text) => text.trim() }),
    getWithoutTotal: () => screen.getByText(DATE_LIST_TEXT.TOTAL_WITHOUT),
    getEditTotal: () => screen.getByRole("button", { name: DATE_LIST_TEXT.TOTAL_EDIT }),
    getTotalInput: () => screen.getByRole("textbox", { name: DATE_LIST_TEXT.TOTAL_INPUT_LABEL }),
    pressEscape: () => user.keyboard("{Escape}"),
    queryEditTotal: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.TOTAL_EDIT }),
    queryTotalInput: () => screen.queryByRole("textbox", { name: DATE_LIST_TEXT.TOTAL_INPUT_LABEL }),
    typeTotal: async (text: string) => {
      const input = screen.getByRole("textbox", { name: DATE_LIST_TEXT.TOTAL_INPUT_LABEL });
      await user.clear(input);
      await user.type(input, text);
    },
    queryCancelDialog: () => screen.queryByRole("dialog"),
    queryCancelList: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.CANCEL_LIST }),
    queryDecrease: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.DECREASE_QUANTITY }),
    queryProductSearch: () => screen.queryByRole("combobox"),
    queryReactivate: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.REACTIVATE }),
  };
};

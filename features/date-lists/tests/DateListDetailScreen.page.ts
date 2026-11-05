import { screen } from "@testing-library/react";
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
    queryCancelDialog: () => screen.queryByRole("dialog"),
    queryCancelList: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.CANCEL_LIST }),
    queryDecrease: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.DECREASE_QUANTITY }),
    queryProductSearch: () => screen.queryByRole("combobox"),
    queryReactivate: () => screen.queryByRole("button", { name: DATE_LIST_TEXT.REACTIVATE }),
  };
};

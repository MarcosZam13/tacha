import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ASSIGNEE_TEXT } from "../constants/assignee-field.constants";

export const createAssigneeFieldPage = () => {
  const user = userEvent.setup();

  const queryFieldButton = (): HTMLElement | null =>
    screen.queryByRole("button", { name: new RegExp(`^${ASSIGNEE_TEXT.FIELD_LABEL}: `, "u") });
  const getFieldButton = (): HTMLElement => screen.getByRole("button", { name: new RegExp(`^${ASSIGNEE_TEXT.FIELD_LABEL}: `, "u") });
  const queryPicker = (): HTMLElement | null => screen.queryByRole("dialog", { name: ASSIGNEE_TEXT.PICKER_TITLE });
  const getOption = (label: string): HTMLElement => within(screen.getByRole("dialog")).getByRole("button", { name: label });
  const getOptionLabels = (): string[] =>
    within(screen.getByRole("dialog"))
      .getAllByRole("listitem")
      .map((item) => item.textContent ?? "");
  const queryAlert = (): HTMLElement | null => screen.queryByRole("alert");

  const openPicker = async (): Promise<void> => {
    await user.click(getFieldButton());
  };

  const chooseOption = async (label: string): Promise<void> => {
    await user.click(getOption(label));
  };

  const cancel = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: ASSIGNEE_TEXT.CANCEL }));
  };

  const pressEscape = async (): Promise<void> => {
    await user.keyboard("{Escape}");
  };

  return {
    cancel,
    chooseOption,
    getFieldButton,
    getOption,
    getOptionLabels,
    openPicker,
    pressEscape,
    queryAlert,
    queryFieldButton,
    queryPicker,
  };
};

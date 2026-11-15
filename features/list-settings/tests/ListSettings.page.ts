import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LIST_SETTINGS_TEXT } from "../constants/list-settings.constants";

/**
 * Page Object de la pantalla de Configuración: cómo encontrar sus partes y tocarlas. Sin aserciones: las hace
 * el test.
 */
export const createListSettingsPage = () => {
  const user = userEvent.setup();

  const getHeading = (): HTMLElement => screen.getByRole("heading", { name: LIST_SETTINGS_TEXT.TITLE });
  const getBackLink = (): HTMLElement => screen.getByRole("link", { name: LIST_SETTINGS_TEXT.BACK_TO_PROFILE });
  // El interruptor dice a qué lista pertenece ("Encargado, Lista general").
  const getSwitch = (listLabel: string): HTMLElement =>
    screen.getByRole("switch", { name: `${LIST_SETTINGS_TEXT.ASSIGNEE_TITLE}, ${listLabel}` });
  const getSwitchCount = (): number => screen.queryAllByRole("switch").length;
  const getRowOf = (listLabel: string): HTMLElement => getSwitch(listLabel).closest("li") as HTMLElement;
  const queryRowAlert = (listLabel: string): HTMLElement | null => within(getRowOf(listLabel)).queryByRole("alert");
  const queryAlert = (): HTMLElement | null => screen.queryByRole("alert");
  const queryEmptyMessage = (): HTMLElement | null => screen.queryByText(LIST_SETTINGS_TEXT.EMPTY);
  const getRetryButton = (): HTMLElement => screen.getByRole("button", { name: LIST_SETTINGS_TEXT.RETRY });

  const toggle = async (listLabel: string): Promise<void> => {
    await user.click(getSwitch(listLabel));
  };

  const retry = async (): Promise<void> => {
    await user.click(getRetryButton());
  };

  return {
    getBackLink,
    getHeading,
    getRetryButton,
    getSwitch,
    getSwitchCount,
    queryAlert,
    queryEmptyMessage,
    queryRowAlert,
    retry,
    toggle,
  };
};

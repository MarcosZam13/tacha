import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { PRODUCT_GROUP_EDITOR_TEXT } from "../constants/product-group-editor.constants";

/**
 * Page Object del editor de grupos (SCRUM-110): cómo encontrar sus elementos
 * y qué puede hacer el usuario. Sin aserciones: las hace el test.
 */
export const createProductGroupEditorPage = () => {
  const user = userEvent.setup();

  const getNameInput = (): HTMLElement => screen.getByLabelText(new RegExp(`^${PRODUCT_GROUP_EDITOR_TEXT.NAME_LABEL}`));
  const getSearchInput = (): HTMLElement => screen.getByLabelText(PRODUCT_SEARCH_TEXT.LABEL);
  const getSaveButton = (): HTMLElement => screen.getByRole("button", { name: PRODUCT_GROUP_EDITOR_TEXT.SAVE });
  const getCancelLink = (): HTMLElement => screen.getByRole("link", { name: PRODUCT_GROUP_EDITOR_TEXT.CANCEL });
  const getStatus = (): HTMLElement => screen.getByRole("status");
  const queryShareCheckbox = (): HTMLElement | null =>
    screen.queryByRole("checkbox", { name: PRODUCT_GROUP_EDITOR_TEXT.SHARE_LABEL });
  const queryAlerts = (): string[] => screen.queryAllByRole("alert").map((alert) => alert.textContent ?? "");

  // Las filas del grupo: la lista que tiene botones "Quitar".
  const queryRows = (): HTMLElement[] =>
    screen
      .queryAllByRole("listitem")
      .filter((row) => within(row).queryByRole("button", { name: new RegExp(`^${PRODUCT_GROUP_EDITOR_TEXT.REMOVE_ITEM_PREFIX}`) }));
  const getRow = (itemLabel: string): HTMLElement => {
    const row = queryRows().find((candidate) => candidate.textContent?.includes(itemLabel));
    if (!row) throw new Error(`No hay una fila para "${itemLabel}"`);
    return row;
  };
  const getRowQuantity = (itemLabel: string): string =>
    within(getRow(itemLabel)).getByText(/^\d+$/).textContent ?? "";

  const typeName = async (name: string): Promise<void> => {
    await user.type(getNameInput(), name);
  };
  // Un resultado del buscador es un botón con el nombre y el tamaño.
  const pickOption = async (productName: string): Promise<void> => {
    await user.click(screen.getByRole("button", { name: new RegExp(`^${productName}`) }));
  };
  const increase = async (itemLabel: string): Promise<void> => {
    await user.click(screen.getByRole("button", { name: `${PRODUCT_GROUP_EDITOR_TEXT.INCREASE_PREFIX}${itemLabel}` }));
  };
  const remove = async (itemLabel: string): Promise<void> => {
    await user.click(screen.getByRole("button", { name: `${PRODUCT_GROUP_EDITOR_TEXT.REMOVE_ITEM_PREFIX}${itemLabel}` }));
  };
  const toggleShare = async (): Promise<void> => {
    await user.click(screen.getByRole("checkbox", { name: PRODUCT_GROUP_EDITOR_TEXT.SHARE_LABEL }));
  };
  const save = async (): Promise<void> => {
    await user.click(getSaveButton());
  };

  return {
    getCancelLink,
    getRowQuantity,
    getSaveButton,
    getSearchInput,
    getStatus,
    increase,
    pickOption,
    queryAlerts,
    queryRows,
    queryShareCheckbox,
    remove,
    save,
    toggleShare,
    typeName,
  };
};

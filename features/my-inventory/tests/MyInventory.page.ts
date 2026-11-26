import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SHELF_LIFE_CHOICE_LABEL,
  SHELF_LIFE_TEXT,
} from "@/features/shopping-list/constants/shelf-life.constants";
import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
import { PRODUCT_SEARCH_TEXT } from "@/constants";
import { INVENTORY_GROUP_TITLE, MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";

/**
 * Page Object de "Mi inventario": cómo encontrar sus elementos y tocarlos.
 * Sin aserciones: las hace el test.
 */
export const createMyInventoryPage = () => {
  const user = userEvent.setup();

  const getTitle = (): HTMLElement => screen.getByRole("heading", { level: 1, name: MY_INVENTORY_TEXT.TITLE });
  const getBackLink = (): HTMLElement => screen.getByRole("link", { name: MY_INVENTORY_TEXT.BACK_TO_LIST });
  const getLoading = (): HTMLElement => screen.getByRole("status", { name: MY_INVENTORY_TEXT.LOADING });
  const findError = (): Promise<HTMLElement> => screen.findByRole("alert");
  const findEmptyState = (): Promise<HTMLElement> => screen.findByText(MY_INVENTORY_TEXT.EMPTY);

  // Los grupos son regiones con su título (h2).
  const findGroups = (): Promise<HTMLElement[]> => screen.findAllByRole("region");
  const getGroupTitles = (): string[] =>
    screen.queryAllByRole("region").map((region) => within(region).getByRole("heading", { level: 2 }).textContent ?? "");
  const getGroup = (group: keyof typeof INVENTORY_GROUP_TITLE): HTMLElement =>
    screen.getByRole("region", { name: INVENTORY_GROUP_TITLE[group] });
  const getItems = (region: HTMLElement): HTMLElement[] => within(region).getAllByRole("listitem");
  const queryProduct = (productName: string): HTMLElement | null => screen.queryByText(productName);
  // El aviso de las acciones: la región "status" sin nombre (la del spinner se llama "Cargando tu inventario").
  const getAnnouncement = (): HTMLElement => {
    const region = screen.getAllByRole("status").find((status) => !status.hasAttribute("aria-label"));
    if (region === undefined) throw new Error("No está la región de avisos");
    return region;
  };
  const getRowOf = (productName: string): HTMLElement => {
    const row = screen.getByText(productName).closest("li");
    if (row === null) throw new Error(`${productName} no está en una fila`);
    return row;
  };

  // SCRUM-106: los botones de cada producto ("Ya se acabó: Leche", "Ajustar fecha: Leche").
  const actionName = (action: string, productName: string): string =>
    `${action}${MY_INVENTORY_TEXT.ACTION_LABEL_SEPARATOR} ${productName}`;
  const getUsedUpButton = (productName: string): HTMLElement =>
    screen.getByRole("button", { name: actionName(MY_INVENTORY_TEXT.USED_UP, productName) });
  const getAdjustButton = (productName: string): HTMLElement =>
    screen.getByRole("button", { name: actionName(MY_INVENTORY_TEXT.ADJUST, productName) });
  const queryChips = (productName: string): HTMLElement | null =>
    screen.queryByRole("group", {
      name: `${SHELF_LIFE_TEXT.GROUP_LABEL_PREFIX} ${productName}${SHELF_LIFE_TEXT.GROUP_LABEL_SUFFIX}`,
    });

  const retry = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: MY_INVENTORY_TEXT.RETRY }));
  };
  const markUsedUp = async (productName: string): Promise<void> => {
    await user.click(getUsedUpButton(productName));
  };
  const toggleAdjust = async (productName: string): Promise<void> => {
    await user.click(getAdjustButton(productName));
  };
  const chooseChip = async (productName: string, choice: ShelfLifeChoiceType): Promise<void> => {
    const chips = queryChips(productName);
    if (chips === null) throw new Error(`Los chips de ${productName} no están abiertos`);
    await user.click(within(chips).getByRole("button", { name: SHELF_LIFE_CHOICE_LABEL[choice] }));
  };

  // SCRUM-107: el panel "+ Agregar a mi inventario".
  const queryOpenAddButton = (): HTMLElement | null =>
    screen.queryByRole("button", { name: MY_INVENTORY_TEXT.ADD_OPEN });
  const findOpenAddButton = (): Promise<HTMLElement> =>
    screen.findByRole("button", { name: MY_INVENTORY_TEXT.ADD_OPEN });
  const queryAddPanel = (): HTMLElement | null => screen.queryByRole("group", { name: MY_INVENTORY_TEXT.ADD_TITLE });
  const getAddPanel = (): HTMLElement => screen.getByRole("group", { name: MY_INVENTORY_TEXT.ADD_TITLE });
  const getAddPanelTitle = (): HTMLElement =>
    within(getAddPanel()).getByRole("heading", { level: 2, name: MY_INVENTORY_TEXT.ADD_TITLE });
  const openAdd = async (): Promise<void> => {
    await user.click(await findOpenAddButton());
  };
  const searchProduct = async (text: string): Promise<void> => {
    await user.type(within(getAddPanel()).getByRole("textbox", { name: PRODUCT_SEARCH_TEXT.LABEL }), text);
  };
  // Las opciones del buscador son botones con el nombre y el tamaño en dos span ("Leche" "1000 ml").
  const searchOptionName = (productName: string, sizeLabel: string): RegExp =>
    new RegExp(`^${productName}\\s*${sizeLabel}$`, "u");
  const findSearchOption = (productName: string, sizeLabel: string): Promise<HTMLElement> =>
    within(getAddPanel()).findByRole("button", { name: searchOptionName(productName, sizeLabel) });
  const chooseSearchOption = async (productName: string, sizeLabel: string): Promise<void> => {
    await user.click(await findSearchOption(productName, sizeLabel));
  };
  const confirmAdd = async (): Promise<void> => {
    await user.click(within(getAddPanel()).getByRole("button", { name: MY_INVENTORY_TEXT.ADD_CONFIRM }));
  };
  const cancelAdd = async (): Promise<void> => {
    await user.click(within(getAddPanel()).getByRole("button", { name: MY_INVENTORY_TEXT.ADD_CANCEL }));
  };
  const changeProduct = async (): Promise<void> => {
    await user.click(within(getAddPanel()).getByRole("button", { name: MY_INVENTORY_TEXT.ADD_CHANGE_PRODUCT }));
  };

  return {
    cancelAdd,
    changeProduct,
    chooseChip,
    chooseSearchOption,
    confirmAdd,
    findOpenAddButton,
    findSearchOption,
    getAddPanel,
    getAddPanelTitle,
    openAdd,
    queryAddPanel,
    queryOpenAddButton,
    searchProduct,
    findEmptyState,
    findError,
    findGroups,
    getAdjustButton,
    getAnnouncement,
    getBackLink,
    getRowOf,
    getGroup,
    getGroupTitles,
    getItems,
    getLoading,
    getTitle,
    getUsedUpButton,
    markUsedUp,
    queryChips,
    queryProduct,
    retry,
    toggleAdjust,
  };
};

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CATALOG_TAB, CATALOG_TAB_LABEL, CATALOG_TABS_TEXT } from "@/constants";
import { CREATE_PRODUCT_FORM_TEXT } from "@/constants/create-product-form.constants";
import { MY_PRODUCT_ACTION_TEXT, MY_PRODUCT_DELETE_TEXT, MY_PRODUCTS_TEXT } from "../constants/my-products.constants";

/**
 * Page Object de "Mis productos": cómo encontrar sus elementos. Sin
 * aserciones: las hace el test.
 */
export const createMyProductsPage = () => {
  const user = userEvent.setup();

  const getTitle = (): HTMLElement =>
    screen.getByRole("heading", { level: 1, name: CATALOG_TABS_TEXT.SECTION_TITLE });
  const getMyProductsTab = (): HTMLElement =>
    screen.getByRole("link", { name: CATALOG_TAB_LABEL[CATALOG_TAB.MY_PRODUCTS] });
  const getSearchTab = (): HTMLElement => screen.getByRole("link", { name: CATALOG_TAB_LABEL[CATALOG_TAB.SEARCH] });

  const getSpinner = (): HTMLElement => screen.getByText(MY_PRODUCTS_TEXT.LOADING);
  const getError = (): HTMLElement => screen.getByRole("alert");
  const getEmptyState = (): HTMLElement => screen.getByText(MY_PRODUCTS_TEXT.EMPTY_SUGGESTION);
  const getCard = (title: string): HTMLElement => screen.getByRole("heading", { name: title });
  const getBadge = (): HTMLElement[] => screen.getAllByText(MY_PRODUCTS_TEXT.BADGE_LABEL);

  const queryError = (): HTMLElement | null => screen.queryByRole("alert");
  const queryEmptyState = (): HTMLElement | null => screen.queryByText(MY_PRODUCTS_TEXT.EMPTY_SUGGESTION);
  // Las tarjetas son las únicas que dibujan un <h2>; los tabs de navegación
  // también son una lista (<ul><li>), así que no sirve contar listitem.
  const queryCards = (): HTMLElement[] => screen.queryAllByRole("heading", { level: 2 });

  // HU-58 (SCRUM-89): botones de cada tarjeta, el formulario de edición y el diálogo de eliminar.
  // El nombre accesible es "Editar" + el nombre oculto del producto; jsdom
  // recorta el espacio del texto oculto ("EditarLeche"), el navegador no.
  const toActionName = (action: string, productName: string): RegExp => new RegExp(`^${action}\\s?${productName}$`);
  const getEditButton = (productName: string): HTMLElement =>
    screen.getByRole("button", { name: toActionName(MY_PRODUCT_ACTION_TEXT.EDIT, productName) });
  const getDeleteButton = (productName: string): HTMLElement =>
    screen.getByRole("button", { name: toActionName(MY_PRODUCT_ACTION_TEXT.TRIGGER_DELETE, productName) });
  const findEditDialog = (): Promise<HTMLElement> =>
    screen.findByRole("dialog", { name: CREATE_PRODUCT_FORM_TEXT.EDIT_TITLE });
  const getNameInput = (): HTMLInputElement =>
    screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.NAME_LABEL, { exact: false }) as HTMLInputElement;
  const findDeleteDialog = (): Promise<HTMLElement> =>
    screen.findByRole("dialog", { name: MY_PRODUCT_DELETE_TEXT.DIALOG_TITLE });
  const findUsageNotice = (): Promise<HTMLElement> => screen.findByRole("status");
  const clickEdit = async (productName: string): Promise<void> => {
    await user.click(getEditButton(productName));
  };
  const clickDelete = async (productName: string): Promise<void> => {
    await user.click(getDeleteButton(productName));
  };
  const confirmDelete = async (): Promise<void> => {
    await user.click(screen.getByRole("button", { name: MY_PRODUCT_DELETE_TEXT.CONFIRM }));
  };

  return {
    clickDelete,
    clickEdit,
    confirmDelete,
    findDeleteDialog,
    findEditDialog,
    findUsageNotice,
    getBadge,
    getDeleteButton,
    getEditButton,
    getNameInput,
    getCard,
    getEmptyState,
    getError,
    getMyProductsTab,
    getSearchTab,
    getSpinner,
    getTitle,
    queryCards,
    queryEmptyState,
    queryError,
  };
};

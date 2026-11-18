import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CREATE_PRODUCT_FORM_TEXT } from "@/constants/create-product-form.constants";
import type { ReferenceStoreChoiceType } from "@/constants/create-product-form.constants";

/**
 * Page Object de CreateProductForm: cómo encontrar sus partes y las
 * acciones de usuario. Sin aserciones: las hace el test.
 */
export const createCreateProductFormPage = () => {
  const user = userEvent.setup();

  const getDialog = () => screen.getByRole("dialog", { name: CREATE_PRODUCT_FORM_TEXT.TITLE });
  const getNameInput = () => screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.NAME_LABEL, { exact: false });
  const getBrandInput = () => screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.BRAND_LABEL);
  const getCategorySelect = () =>
    screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.CATEGORY_LABEL, { exact: false }) as HTMLSelectElement;
  const getQuantityInput = () => screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.QUANTITY_LABEL, { exact: false });
  const getUnitSelect = () =>
    screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.UNIT_LABEL) as HTMLSelectElement;
  const getShareCheckbox = () => screen.getByRole("checkbox", { name: CREATE_PRODUCT_FORM_TEXT.SHARE_LABEL });
  // HU-57: tienda y precio de referencia.
  const getStoreSelect = () => screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.STORE_LABEL) as HTMLSelectElement;
  const getStoreOptionLabels = () => Array.from(getStoreSelect().options).map((option) => option.textContent);
  const getStoreNameInput = () => screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.STORE_NAME_LABEL, { exact: false });
  const getPriceInput = () => screen.getByLabelText(CREATE_PRODUCT_FORM_TEXT.PRICE_LABEL);
  const getSaveButton = () => screen.getByRole("button", { name: /guardar|guardando/i });
  const getCancelButton = () => screen.getByRole("button", { name: CREATE_PRODUCT_FORM_TEXT.CANCEL });
  const getErrorAlert = () => screen.getByRole("alert");
  // Los errores de los Input (name/quantity) no llevan role="alert" (mismo
  // criterio que components/ui/input/Input.tsx), se buscan por su texto.
  const getFieldError = (errorText: string) => screen.getByText(errorText);

  const queryDialog = () => screen.queryByRole("dialog", { name: CREATE_PRODUCT_FORM_TEXT.TITLE });
  const queryShareCheckbox = () => screen.queryByRole("checkbox", { name: CREATE_PRODUCT_FORM_TEXT.SHARE_LABEL });
  const queryStoreNameInput = () =>
    screen.queryByLabelText(CREATE_PRODUCT_FORM_TEXT.STORE_NAME_LABEL, { exact: false });

  const typeName = async (name: string) => {
    await user.type(getNameInput(), name);
  };

  const selectCategory = async (categoryId: string) => {
    await user.selectOptions(getCategorySelect(), categoryId);
  };

  const typeQuantity = async (quantity: string) => {
    await user.type(getQuantityInput(), quantity);
  };

  const selectStore = async (storeChoice: ReferenceStoreChoiceType) => {
    await user.selectOptions(getStoreSelect(), storeChoice);
  };

  const typeStoreName = async (storeName: string) => {
    await user.type(getStoreNameInput(), storeName);
  };

  const typePrice = async (price: string) => {
    await user.type(getPriceInput(), price);
  };

  // Salir del campo con Tab, como lo haría el usuario.
  const leaveField = async () => {
    await user.tab();
  };

  const toggleShareCheckbox = async () => {
    await user.click(getShareCheckbox());
  };

  const submit = async () => {
    await user.click(getSaveButton());
  };

  const cancel = async () => {
    await user.click(getCancelButton());
  };

  return {
    cancel,
    leaveField,
    getBrandInput,
    getCancelButton,
    getCategorySelect,
    getDialog,
    getErrorAlert,
    getFieldError,
    getPriceInput,
    getQuantityInput,
    getSaveButton,
    getShareCheckbox,
    getStoreNameInput,
    getStoreOptionLabels,
    getStoreSelect,
    getUnitSelect,
    queryDialog,
    queryShareCheckbox,
    queryStoreNameInput,
    selectCategory,
    selectStore,
    submit,
    toggleShareCheckbox,
    typeName,
    typePrice,
    typeQuantity,
    typeStoreName,
  };
};

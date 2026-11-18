// @vitest-environment jsdom
import type { FormEvent } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CREATE_PRODUCT_FORM_ERROR,
  CREATE_PRODUCT_FORM_TEXT,
  REFERENCE_STORE_CHOICE,
  REFERENCE_STORE_NAME_MAX_LENGTH,
} from "@/constants/create-product-form.constants";
import { STORE_NAMES } from "@/constants/stores.constants";
import { getCategories } from "@/services/catalog.service";
import { createPersonalProduct, hasHousehold } from "@/services/personal-product.service";
import type { Category } from "@/types/catalog.types";
import { useCreateProductForm } from "../useCreateProductForm";
import type { UseCreateProductFormReturn } from "../useCreateProductForm";

vi.mock("@/services/catalog.service", () => ({ getCategories: vi.fn() }));
vi.mock("@/services/personal-product.service", () => ({
  createPersonalProduct: vi.fn(),
  hasHousehold: vi.fn(),
}));

const getCategoriesMock = vi.mocked(getCategories);
const createPersonalProductMock = vi.mocked(createPersonalProduct);
const hasHouseholdMock = vi.mocked(hasHousehold);

const CATEGORIES: Category[] = [{ id: "category-1", name: "Lácteos" }];

// El hook solo usa preventDefault del evento del formulario.
const createSubmitEvent = (): FormEvent<HTMLFormElement> =>
  ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getCategoriesMock.mockResolvedValue(CATEGORIES);
  hasHouseholdMock.mockResolvedValue(false);
});

// Abre el formulario y espera a que termine de cargar categorías/household.
const renderOpen = async (onSuccess = vi.fn()) => {
  const hook = renderHook(() => useCreateProductForm(onSuccess));
  act(() => hook.result.current.onOpen());
  await waitFor(() => expect(hook.result.current.isCategoriesLoading).toBe(false));
  return hook;
};

// Llena los 3 campos obligatorios (CA-02) con valores válidos.
const fillRequiredFields = (result: { current: UseCreateProductFormReturn }): void => {
  act(() => result.current.onNameChange("Tamal navideño"));
  act(() => result.current.onCategoryChange("category-1"));
  act(() => result.current.onQuantityChange("500"));
};

describe("useCreateProductForm: estados", () => {
  it("starts closed, without loading categories", () => {
    const { result } = renderHook(() => useCreateProductForm(vi.fn()));

    expect(result.current.isOpen).toBe(false);
    expect(result.current.categories).toEqual([]);
    expect(getCategoriesMock).not.toHaveBeenCalled();
  });

  it("loads categories and whether the user has a household when opened", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    const { result } = await renderOpen();

    expect(result.current.isOpen).toBe(true);
    expect(result.current.categories).toEqual(CATEGORIES);
    expect(result.current.showShareCheckbox).toBe(true);
  });

  it("does not show the share checkbox when the user has no household", async () => {
    hasHouseholdMock.mockResolvedValue(false);
    const { result } = await renderOpen();

    expect(result.current.showShareCheckbox).toBe(false);
  });

  it("shows a generic error when loading categories fails", async () => {
    getCategoriesMock.mockRejectedValue(new Error("network error"));
    const { result } = await renderOpen();

    expect(result.current.categoriesErrorMessage).toBe(CREATE_PRODUCT_FORM_TEXT.CATEGORIES_ERROR);
  });

  it("resets the fields and closes on cancel", async () => {
    const { result } = await renderOpen();
    fillRequiredFields(result);

    act(() => result.current.onCancel());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.name).toBe("");
    expect(result.current.categoryId).toBe("");
    expect(result.current.quantity).toBe("");
  });
});

// CA-02: nombre y categoría obligatorios; la cantidad corre la misma regla
// porque sin ella no hay variante que crear (SPEC.md §5).
describe("useCreateProductForm: validación (CA-02)", () => {
  it("shows the name error and does not call the service when the name is empty", async () => {
    const { result } = await renderOpen();
    act(() => result.current.onCategoryChange("category-1"));
    act(() => result.current.onQuantityChange("500"));

    act(() => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.nameError).toBe(CREATE_PRODUCT_FORM_ERROR.NAME_REQUIRED);
    expect(createPersonalProductMock).not.toHaveBeenCalled();
  });

  it("shows the category error and does not call the service when no category is selected", async () => {
    const { result } = await renderOpen();
    act(() => result.current.onNameChange("Tamal"));
    act(() => result.current.onQuantityChange("500"));

    act(() => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.categoryError).toBe(CREATE_PRODUCT_FORM_ERROR.CATEGORY_REQUIRED);
    expect(createPersonalProductMock).not.toHaveBeenCalled();
  });

  it("shows the quantity error and does not call the service when the quantity is 0", async () => {
    const { result } = await renderOpen();
    act(() => result.current.onNameChange("Tamal"));
    act(() => result.current.onCategoryChange("category-1"));
    act(() => result.current.onQuantityChange("0"));

    act(() => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.quantityError).toBe(CREATE_PRODUCT_FORM_ERROR.QUANTITY_REQUIRED);
    expect(createPersonalProductMock).not.toHaveBeenCalled();
  });

  it("disables submit (canSubmit) until all 3 required fields are valid", async () => {
    const { result } = await renderOpen();

    expect(result.current.canSubmit).toBe(false);

    fillRequiredFields(result);

    expect(result.current.canSubmit).toBe(true);
  });

  it("clears a field's error as soon as the user types in it again", async () => {
    const { result } = await renderOpen();
    act(() => result.current.onSubmit(createSubmitEvent()));
    expect(result.current.nameError).toBeDefined();

    act(() => result.current.onNameChange("Tamal"));

    expect(result.current.nameError).toBeUndefined();
  });
});

describe("useCreateProductForm: guardar", () => {
  it("calls createPersonalProduct with the trimmed, parsed payload", async () => {
    createPersonalProductMock.mockResolvedValue("product-1");
    const { result } = await renderOpen();
    act(() => result.current.onNameChange("  Tamal navideño  "));
    act(() => result.current.onCategoryChange("category-1"));
    act(() => result.current.onQuantityChange("500"));

    await act(async () => result.current.onSubmit(createSubmitEvent()));

    expect(createPersonalProductMock).toHaveBeenCalledWith({
      baseQuantity: 500,
      baseUnit: "ml",
      brandName: undefined,
      categoryId: "category-1",
      name: "Tamal navideño",
      shareWithHousehold: false,
    });
  });

  it("calls onSuccess with the new product id, resets the fields and closes", async () => {
    createPersonalProductMock.mockResolvedValue("product-1");
    const onSuccess = vi.fn();
    const { result } = await renderOpen(onSuccess);
    fillRequiredFields(result);

    await act(async () => result.current.onSubmit(createSubmitEvent()));

    expect(onSuccess).toHaveBeenCalledWith("product-1");
    expect(result.current.isOpen).toBe(false);
    expect(result.current.name).toBe("");
  });

  // SPEC.md §7: nunca el error.message crudo del servidor, el formulario
  // sigue abierto con lo ya escrito (no se pierde el trabajo del usuario).
  it("shows a generic error and keeps the form open with what was typed when the RPC fails", async () => {
    createPersonalProductMock.mockRejectedValue({ code: "500", message: "server exploded" });
    const { result } = await renderOpen();
    fillRequiredFields(result);

    await act(async () => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.errorMessage).toBe(CREATE_PRODUCT_FORM_TEXT.SUBMIT_ERROR);
    expect(result.current.isOpen).toBe(true);
    expect(result.current.name).toBe("Tamal navideño");
  });
});

// HU-57 (SCRUM-88): tienda y precio de referencia, los dos opcionales.
describe("useCreateProductForm: tienda y precio de referencia (HU-57)", () => {
  it("allows saving without a store or a price", async () => {
    const { result } = await renderOpen();

    fillRequiredFields(result);

    expect(result.current.canSubmit).toBe(true);
    expect(result.current.showStoreNameInput).toBe(false);
  });

  it("shows the price error and does not call the service when the price is 0 or less", async () => {
    const { result } = await renderOpen();
    fillRequiredFields(result);
    act(() => result.current.onPriceChange("0"));

    act(() => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.priceError).toBe(CREATE_PRODUCT_FORM_ERROR.PRICE_INVALID);
    expect(result.current.canSubmit).toBe(false);
    expect(createPersonalProductMock).not.toHaveBeenCalled();
  });

  it("asks for the store name when the custom store is chosen without one", async () => {
    const { result } = await renderOpen();
    fillRequiredFields(result);
    act(() => result.current.onStoreChoiceChange(REFERENCE_STORE_CHOICE.CUSTOM));

    act(() => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.showStoreNameInput).toBe(true);
    expect(result.current.storeNameError).toBe(CREATE_PRODUCT_FORM_ERROR.STORE_NAME_REQUIRED);
    expect(createPersonalProductMock).not.toHaveBeenCalled();
  });

  it("rejects a store name longer than the database allows", async () => {
    const { result } = await renderOpen();
    fillRequiredFields(result);
    act(() => result.current.onStoreChoiceChange(REFERENCE_STORE_CHOICE.CUSTOM));
    act(() => result.current.onStoreNameChange("a".repeat(REFERENCE_STORE_NAME_MAX_LENGTH + 1)));

    act(() => result.current.onSubmit(createSubmitEvent()));

    expect(result.current.storeNameError).toBe(CREATE_PRODUCT_FORM_ERROR.STORE_NAME_TOO_LONG);
    expect(createPersonalProductMock).not.toHaveBeenCalled();
  });

  it("sends the chosen supermarket and the parsed price", async () => {
    createPersonalProductMock.mockResolvedValue("product-1");
    const { result } = await renderOpen();
    fillRequiredFields(result);
    act(() => result.current.onStoreChoiceChange(STORE_NAMES.MAXIPALI));
    act(() => result.current.onPriceChange("2850.5"));

    await act(async () => result.current.onSubmit(createSubmitEvent()));

    expect(createPersonalProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referencePrice: 2850.5,
        referenceStoreName: undefined,
        referenceStoreSlug: STORE_NAMES.MAXIPALI,
      }),
    );
  });

  it("sends the custom store name trimmed, without a supermarket", async () => {
    createPersonalProductMock.mockResolvedValue("product-1");
    const { result } = await renderOpen();
    fillRequiredFields(result);
    act(() => result.current.onStoreChoiceChange(REFERENCE_STORE_CHOICE.CUSTOM));
    act(() => result.current.onStoreNameChange("  Carnicería Los Ángeles  "));

    await act(async () => result.current.onSubmit(createSubmitEvent()));

    expect(createPersonalProductMock).toHaveBeenCalledWith(
      expect.objectContaining({
        referencePrice: undefined,
        referenceStoreName: "Carnicería Los Ángeles",
        referenceStoreSlug: undefined,
      }),
    );
  });

  it("clears the typed store name when another store is chosen", async () => {
    const { result } = await renderOpen();
    act(() => result.current.onStoreChoiceChange(REFERENCE_STORE_CHOICE.CUSTOM));
    act(() => result.current.onStoreNameChange("Pulpería"));

    act(() => result.current.onStoreChoiceChange(STORE_NAMES.WALMART));

    expect(result.current.storeName).toBe("");
    expect(result.current.showStoreNameInput).toBe(false);
  });

  it("resets the store and the price on cancel", async () => {
    const { result } = await renderOpen();
    act(() => result.current.onStoreChoiceChange(STORE_NAMES.WALMART));
    act(() => result.current.onPriceChange("1500"));

    act(() => result.current.onCancel());

    expect(result.current.storeChoice).toBe(REFERENCE_STORE_CHOICE.NONE);
    expect(result.current.price).toBe("");
  });
});

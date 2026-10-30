// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CREATE_PRODUCT_FORM_ERROR, CREATE_PRODUCT_FORM_TEXT } from "@/constants/create-product-form.constants";
import { CreateProductForm } from "../CreateProductForm";
import type { CreateProductFormProps } from "../models/CreateProductFormProps.interface";
import { createCreateProductFormPage } from "./CreateProductForm.page";

afterEach(cleanup);

const createProps = (overrides: Partial<CreateProductFormProps> = {}): CreateProductFormProps => ({
  baseUnit: "ml",
  brandName: "",
  canSubmit: false,
  categories: [{ id: "category-1", name: "Lácteos" }],
  categoriesErrorMessage: null,
  categoryError: undefined,
  categoryId: "",
  errorMessage: null,
  isCategoriesLoading: false,
  isOpen: true,
  isSubmitting: false,
  name: "",
  nameError: undefined,
  onBaseUnitChange: vi.fn(),
  onBrandNameChange: vi.fn(),
  onCancel: vi.fn(),
  onCategoryChange: vi.fn(),
  onNameChange: vi.fn(),
  onOpen: vi.fn(),
  onQuantityChange: vi.fn(),
  onShareWithHouseholdChange: vi.fn(),
  onSubmit: vi.fn(),
  quantity: "",
  quantityError: undefined,
  shareWithHousehold: false,
  showShareCheckbox: false,
  ...overrides,
});

describe("CreateProductForm", () => {
  it("renders nothing when closed", () => {
    render(<CreateProductForm {...createProps({ isOpen: false })} />);
    const page = createCreateProductFormPage();

    expect(page.queryDialog()).not.toBeInTheDocument();
  });

  it("shows name, brand, category, quantity and unit fields when open", () => {
    render(<CreateProductForm {...createProps()} />);
    const page = createCreateProductFormPage();

    expect(page.getDialog()).toBeInTheDocument();
    expect(page.getBrandInput()).toBeInTheDocument();
    expect(page.getCategorySelect()).toBeInTheDocument();
    expect(page.getQuantityInput()).toBeInTheDocument();
    expect(page.getUnitSelect()).toBeInTheDocument();
  });

  // CA-02: nombre vacío → error inline en el campo (Input, sin role="alert",
  // mismo criterio que SCRUM-137), "Guardar" no se habilita.
  it("shows the name inline error and disables save when canSubmit is false", () => {
    render(
      <CreateProductForm
        {...createProps({ canSubmit: false, nameError: CREATE_PRODUCT_FORM_ERROR.NAME_REQUIRED })}
      />,
    );
    const page = createCreateProductFormPage();

    expect(page.getFieldError(CREATE_PRODUCT_FORM_ERROR.NAME_REQUIRED)).toBeInTheDocument();
    expect(page.getSaveButton()).toBeDisabled();
  });

  // CA-02: categoría sin seleccionar → error inline, con role="alert" (propio de este formulario).
  it("shows the category inline error as an alert", () => {
    render(
      <CreateProductForm {...createProps({ categoryError: CREATE_PRODUCT_FORM_ERROR.CATEGORY_REQUIRED })} />,
    );
    const page = createCreateProductFormPage();

    expect(page.getErrorAlert()).toHaveTextContent(CREATE_PRODUCT_FORM_ERROR.CATEGORY_REQUIRED);
  });

  it("enables save once canSubmit is true", () => {
    render(<CreateProductForm {...createProps({ canSubmit: true })} />);
    const page = createCreateProductFormPage();

    expect(page.getSaveButton()).toBeEnabled();
  });

  it("disables the category select while categories are loading", () => {
    render(<CreateProductForm {...createProps({ isCategoriesLoading: true })} />);
    const page = createCreateProductFormPage();

    expect(page.getCategorySelect()).toBeDisabled();
  });

  it("shows a generic error when categories failed to load", () => {
    render(<CreateProductForm {...createProps({ categoriesErrorMessage: CREATE_PRODUCT_FORM_TEXT.CATEGORIES_ERROR })} />);
    const page = createCreateProductFormPage();

    expect(page.getErrorAlert()).toHaveTextContent(CREATE_PRODUCT_FORM_TEXT.CATEGORIES_ERROR);
  });

  // CA-03 (con household, compartiendo/sin compartir): el checkbox solo se
  // muestra si el usuario tiene household (showShareCheckbox).
  it("shows the share checkbox only when the user has a household", () => {
    render(<CreateProductForm {...createProps({ showShareCheckbox: true })} />);
    const page = createCreateProductFormPage();

    expect(page.getShareCheckbox()).toBeInTheDocument();
  });

  it("hides the share checkbox when the user has no household", () => {
    render(<CreateProductForm {...createProps({ showShareCheckbox: false })} />);
    const page = createCreateProductFormPage();

    expect(page.queryShareCheckbox()).not.toBeInTheDocument();
  });

  it("notifies when the share checkbox is toggled", async () => {
    const onShareWithHouseholdChange = vi.fn();
    render(
      <CreateProductForm
        {...createProps({ onShareWithHouseholdChange, shareWithHousehold: false, showShareCheckbox: true })}
      />,
    );
    const page = createCreateProductFormPage();

    await page.toggleShareCheckbox();

    expect(onShareWithHouseholdChange).toHaveBeenCalledWith(true);
  });

  // SPEC.md §7: la falla del RPC se ve, el formulario sigue abierto con lo escrito.
  it("shows the submit error message", () => {
    render(<CreateProductForm {...createProps({ errorMessage: CREATE_PRODUCT_FORM_TEXT.SUBMIT_ERROR })} />);
    const page = createCreateProductFormPage();

    expect(page.getErrorAlert()).toHaveTextContent(CREATE_PRODUCT_FORM_TEXT.SUBMIT_ERROR);
  });

  it("shows the saving label and disables both buttons while submitting", () => {
    render(<CreateProductForm {...createProps({ canSubmit: true, isSubmitting: true })} />);
    const page = createCreateProductFormPage();

    expect(page.getSaveButton()).toHaveTextContent(CREATE_PRODUCT_FORM_TEXT.SAVING);
    expect(page.getSaveButton()).toBeDisabled();
    expect(page.getCancelButton()).toBeDisabled();
  });

  it("calls onCancel when cancel is clicked", async () => {
    const onCancel = vi.fn();
    render(<CreateProductForm {...createProps({ onCancel })} />);
    const page = createCreateProductFormPage();

    await page.cancel();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("notifies typing in the name field", async () => {
    const onNameChange = vi.fn();
    render(<CreateProductForm {...createProps({ onNameChange })} />);
    const page = createCreateProductFormPage();

    await page.typeName("Tamal");

    expect(onNameChange).toHaveBeenCalled();
  });
});

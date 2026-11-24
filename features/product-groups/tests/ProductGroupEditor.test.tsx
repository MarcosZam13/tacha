// @vitest-environment jsdom
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { useProductSearch } from "@/hooks/useProductSearch";
import { searchCatalogIncludingOwn } from "@/services/catalog.service";
import { hasHousehold } from "@/services/personal-product.service";
import type { CatalogProduct } from "@/types/catalog.types";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import { PRODUCT_GROUP_EDITOR_ERROR, PRODUCT_GROUP_EDITOR_TEXT } from "../constants/product-group-editor.constants";
import { ProductGroupEditor } from "../ProductGroupEditor";
import { createProductGroup } from "../services/product-groups.service";
import { createProductGroupEditorPage } from "./ProductGroupEditor.page";

// Sin Supabase real ni navegación: el buscador, los servicios y el router son simulados.
const pushMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: pushMock }) }));
vi.mock("@/hooks/useProductSearch", () => ({ useProductSearch: vi.fn() }));
vi.mock("@/services/personal-product.service", () => ({ hasHousehold: vi.fn() }));
vi.mock("../services/product-groups.service", () => ({ createProductGroup: vi.fn() }));

const useProductSearchMock = vi.mocked(useProductSearch);
const hasHouseholdMock = vi.mocked(hasHousehold);
const createProductGroupMock = vi.mocked(createProductGroup);

const LECHE: CatalogProduct = {
  category: "Lácteos",
  productId: "product-leche",
  productName: "Leche",
  variants: [{ baseQuantity: 1000, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: "variant-leche" }],
};
const QUESO_CASERO: CatalogProduct = {
  category: "Lácteos",
  isPersonal: true,
  productId: "product-queso",
  productName: "Queso casero",
  variants: [{ baseQuantity: 500, baseUnit: "g", imageUrl: null, priceRangeByStore: {}, variantId: "variant-queso" }],
};
const LECHE_LABEL = `Leche — ${formatSizeLabel(1000, "ml")}`;
const QUESO_LABEL = `Queso casero — ${formatSizeLabel(500, "g")}`;

afterEach(cleanup);

beforeEach(() => {
  pushMock.mockReset();
  createProductGroupMock.mockReset();
  hasHouseholdMock.mockReset().mockResolvedValue(false);
  useProductSearchMock.mockReset().mockReturnValue({
    clearQuery: vi.fn(),
    errorMessage: null,
    hasNoResults: false,
    isSearching: false,
    query: "le",
    results: [LECHE, QUESO_CASERO],
    setQuery: vi.fn(),
  });
});

describe("ProductGroupEditor", () => {
  // Regla 5: el buscador del editor también trae mis productos y los de mi familia.
  it("searches the catalog including my own products", () => {
    render(<ProductGroupEditor />);

    expect(useProductSearchMock).toHaveBeenCalledWith(searchCatalogIncludingOwn);
  });

  it("links Cancel back to Mis grupos", () => {
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    expect(page.getCancelLink()).toHaveAttribute("href", APP_ROUTE.LIST_GROUPS);
  });

  // Caso 8 (CA-01): elegir una presentación agrega una fila con cantidad 1; "+" la sube.
  it("adds a picked option as a row and steps its quantity", async () => {
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.pickOption("Leche");
    expect(page.getRowQuantity(LECHE_LABEL)).toBe("1");
    expect(page.getStatus()).toHaveTextContent(`${PRODUCT_GROUP_EDITOR_TEXT.ITEM_ADDED_PREFIX}${LECHE_LABEL}`);

    await page.increase(LECHE_LABEL);
    await page.increase(LECHE_LABEL);
    expect(page.getRowQuantity(LECHE_LABEL)).toBe("3");
  });

  // Caso 10: la misma presentación otra vez suma 1 en vez de duplicar la fila.
  it("adds 1 to the existing row when the same option is picked again", async () => {
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.pickOption("Leche");
    await page.pickOption("Leche");

    expect(page.queryRows()).toHaveLength(1);
    expect(page.getRowQuantity(LECHE_LABEL)).toBe("2");
  });

  // Caso 11 (CA-02): "Quitar" saca la fila antes de guardar.
  it("removes a row before saving", async () => {
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.pickOption("Leche");
    await page.pickOption("Queso casero");
    await page.remove(LECHE_LABEL);

    expect(page.queryRows()).toHaveLength(1);
    expect(page.getStatus()).toHaveTextContent(`${PRODUCT_GROUP_EDITOR_TEXT.ITEM_REMOVED_PREFIX}${LECHE_LABEL}`);
  });

  // Caso 12 (CA-03): sin familia no hay casilla de compartir.
  it("hides the share checkbox when the user has no household", async () => {
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await waitFor(() => expect(hasHouseholdMock).toHaveBeenCalled());
    expect(page.queryShareCheckbox()).not.toBeInTheDocument();
  });

  // Caso 15: sin nombre ni productos no guarda.
  it("shows both errors and does not save an empty group", async () => {
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.save();

    expect(page.queryAlerts()).toEqual([PRODUCT_GROUP_EDITOR_ERROR.ITEMS_REQUIRED]);
    expect(page.getSaveButton()).toBeEnabled();
    expect(createProductGroupMock).not.toHaveBeenCalled();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // Caso 14: con familia, compartir con un producto personal sin compartir no guarda.
  it("names the personal products when sharing a group that has them", async () => {
    hasHouseholdMock.mockResolvedValue(true);
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.typeName("Para todos");
    await page.pickOption("Queso casero");
    await waitFor(() => expect(page.queryShareCheckbox()).toBeInTheDocument());
    await page.toggleShare();
    await page.save();

    expect(page.queryAlerts()).toEqual([`${PRODUCT_GROUP_EDITOR_ERROR.SHARE_WITH_PERSONAL_PREFIX}Queso casero`]);
    expect(createProductGroupMock).not.toHaveBeenCalled();
  });

  // Caso 16: al guardar vuelve a "Mis grupos".
  it("saves the group in the picked order and goes back to Mis grupos", async () => {
    createProductGroupMock.mockResolvedValue("group-1");
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.typeName("  Desayuno  ");
    await page.pickOption("Queso casero");
    await page.pickOption("Leche");
    await page.increase(LECHE_LABEL);
    await page.save();

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(APP_ROUTE.LIST_GROUPS));
    expect(createProductGroupMock).toHaveBeenCalledWith({
      items: [
        expect.objectContaining({ quantity: 1, variantId: "variant-queso" }),
        expect.objectContaining({ quantity: 2, variantId: "variant-leche" }),
      ],
      name: "  Desayuno  ",
      shareWithHousehold: false,
    });
    expect(page.getRowQuantity(QUESO_LABEL)).toBe("1");
  });

  it("keeps everything and shows the error when saving fails", async () => {
    createProductGroupMock.mockRejectedValue(new Error("boom"));
    render(<ProductGroupEditor />);
    const page = createProductGroupEditorPage();

    await page.typeName("Desayuno");
    await page.pickOption("Leche");
    await page.save();

    await waitFor(() => expect(page.queryAlerts()).toEqual([PRODUCT_GROUP_EDITOR_TEXT.SAVE_ERROR]));
    expect(page.queryRows()).toHaveLength(1);
    expect(pushMock).not.toHaveBeenCalled();
  });
});

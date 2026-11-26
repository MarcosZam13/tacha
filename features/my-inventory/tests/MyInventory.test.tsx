// @vitest-environment jsdom
import { cleanup, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE, PRODUCT_SEARCH_TEXT } from "@/constants";
import { MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import { MyInventory } from "../MyInventory";
import type { InventoryItem } from "../models/InventoryItem.interface";
import { SHELF_LIFE_CHOICE } from "@/features/shopping-list/constants/shelf-life.constants";
import { searchCatalog } from "@/services/catalog.service";
import type { CatalogProduct } from "@/types/catalog.types";
import {
  addInventoryItem,
  adjustInventoryItem,
  getMyInventory,
  markInventoryItemUsedUp,
} from "../services/my-inventory.service";
import { createMyInventoryPage } from "./MyInventory.page";

// Sin Supabase real: el inventario sale de un servicio simulado.
vi.mock("../services/my-inventory.service", () => ({
  addInventoryItem: vi.fn(),
  adjustInventoryItem: vi.fn(),
  getMyInventory: vi.fn(),
  markInventoryItemUsedUp: vi.fn(),
}));
// El buscador del panel de SCRUM-107 (useProductSearch) usa el catálogo.
vi.mock("@/services/catalog.service", () => ({ searchCatalog: vi.fn() }));
const getMyInventoryMock = vi.mocked(getMyInventory);
const markUsedUpMock = vi.mocked(markInventoryItemUsedUp);
const adjustMock = vi.mocked(adjustInventoryItem);
const addMock = vi.mocked(addInventoryItem);
const searchCatalogMock = vi.mocked(searchCatalog);

// Leche con dos presentaciones, como la devuelve el catálogo.
const LECHE_IN_CATALOG: CatalogProduct = {
  category: "Lácteos",
  productId: "product-leche",
  productName: "Leche",
  variants: [
    { baseQuantity: 1000, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: "variant-Leche" },
    { baseQuantity: 500, baseUnit: "ml", imageUrl: null, priceRangeByStore: {}, variantId: "variant-Leche-500" },
  ],
};

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
});

// Fechas relativas a hoy (el reloj real): solo importa cuántos días faltan.
const itemOutInDays = (productName: string, days: number | null): InventoryItem => {
  const outDay = new Date();
  outDay.setDate(outDay.getDate() + (days ?? 0));
  outDay.setHours(15, 0, 0, 0);
  return {
    expectedOutAt: days === null ? null : outDay.toISOString(),
    productName,
    sizeLabel: "1000 ml",
    variantId: `variant-${productName}`,
  };
};

describe("MyInventory (SCRUM-105)", () => {
  it("muestra el título y el enlace para volver a la lista", () => {
    getMyInventoryMock.mockReturnValue(new Promise(() => {}));
    render(<MyInventory />);
    const page = createMyInventoryPage();

    expect(page.getTitle()).toBeTruthy();
    expect(page.getBackLink()).toHaveAttribute("href", APP_ROUTE.LIST);
    expect(page.getLoading()).toBeTruthy();
  });

  it("agrupa por urgencia, en orden, con cuánto le queda a cada producto (CA-01, CA-02)", async () => {
    getMyInventoryMock.mockResolvedValue([
      itemOutInDays("Leche", 3),
      itemOutInDays("Café", 20),
      itemOutInDays("Arroz", 60),
      itemOutInDays("Sal", null),
    ]);
    render(<MyInventory />);
    const page = createMyInventoryPage();

    await page.findGroups();

    expect(page.getGroupTitles()).toEqual(["Vence pronto", "Este mes", "Más adelante", "Sin fecha estimada"]);
    const soon = page.getItems(page.getGroup("soon"));
    expect(within(soon[0]).getByText("Leche")).toBeTruthy();
    expect(within(soon[0]).getByText("1000 ml")).toBeTruthy();
    expect(within(soon[0]).getByText("Te quedan 3 días")).toBeTruthy();
    expect(within(page.getItems(page.getGroup("later"))[0]).getByText("Te quedan 60 días")).toBeTruthy();
  });

  it("en Sin fecha estimada solo muestra el producto, sin días", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Sal", null)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();

    await page.findGroups();

    const item = page.getItems(page.getGroup("noDate"))[0];
    expect(within(item).getByText("Sal")).toBeTruthy();
    expect(within(item).queryByText(/Te qued|Se acaba/u)).toBeNull();
  });

  it("sin nada en el inventario, muestra el estado vacío (CA-04)", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    render(<MyInventory />);
    const page = createMyInventoryPage();

    expect(await page.findEmptyState()).toBeTruthy();
  });

  it("si falla, muestra el error y Reintentar vuelve a pedirlo", async () => {
    getMyInventoryMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce([itemOutInDays("Leche", 3)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();

    expect(await page.findError()).toHaveTextContent("No se pudo cargar tu inventario. Intenta de nuevo.");
    await page.retry();

    await waitFor(() => expect(getMyInventoryMock).toHaveBeenCalledTimes(2));
    expect(await page.findGroups()).toHaveLength(1);
  });
});

describe("MyInventory: Ya se acabó y ajustar la fecha (SCRUM-106)", () => {
  it("cada producto tiene Ajustar fecha y Ya se acabó, con el producto en el nombre accesible", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();

    await page.findGroups();

    expect(page.getUsedUpButton("Leche")).toHaveTextContent("Ya se acabó");
    expect(page.getAdjustButton("Leche")).toHaveAttribute("aria-expanded", "false");
    expect(page.queryChips("Leche")).toBeNull();
  });

  it("Ya se acabó saca el producto en el momento y guarda (CA-01)", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3), itemOutInDays("Café", 20)]);
    markUsedUpMock.mockReturnValue(new Promise(() => {}));
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.markUsedUp("Leche");

    // Sin esperar a la base: ya no está.
    expect(page.queryProduct("Leche")).toBeNull();
    expect(page.queryProduct("Café")).toBeTruthy();
    expect(markUsedUpMock).toHaveBeenCalledWith("variant-Leche");
  });

  it("si era el único producto, queda el estado vacío", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3)]);
    markUsedUpMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.markUsedUp("Leche");

    expect(await page.findEmptyState()).toBeTruthy();
  });

  it("si Ya se acabó falla, el producto vuelve a su lugar con el error solo en su fila", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3), itemOutInDays("Huevos", 5)]);
    markUsedUpMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.markUsedUp("Leche");

    const alert = await page.findError();
    expect(alert).toHaveTextContent("No se pudo guardar. Intenta de nuevo.");
    expect(page.getRowOf("Leche")).toContainElement(alert);
    expect(within(page.getRowOf("Huevos")).queryByRole("alert")).toBeNull();
    const soonItems = page.getItems(page.getGroup("soon"));
    expect(within(soonItems[0]).getByText("Leche")).toBeTruthy();

    // OBS-1 de la PR #124: el foco vuelve a la fila, no se queda en el título.
    await waitFor(() => expect(page.getAdjustButton("Leche")).toHaveFocus());
    // Y el aviso "ya no está en tu inventario" se borra: dejó de ser cierto.
    expect(page.getAnnouncement()).not.toHaveTextContent("ya no está en tu inventario");

    // Volver a intentar funciona.
    await page.markUsedUp("Leche");

    expect(page.queryProduct("Leche")).toBeNull();
    expect(markUsedUpMock).toHaveBeenCalledTimes(2);
  });

  it("después de Ya se acabó, avisa al lector de pantalla y el foco pasa al título", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3), itemOutInDays("Café", 20)]);
    markUsedUpMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.markUsedUp("Leche");

    expect(page.getAnnouncement()).toHaveTextContent("Leche ya no está en tu inventario.");
    expect(page.getTitle()).toHaveFocus();
  });

  it("abrir los chips de un producto cierra los del otro", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3), itemOutInDays("Café", 20)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.toggleAdjust("Café");

    expect(page.queryChips("Leche")).toBeNull();
    expect(page.queryChips("Café")).toBeTruthy();
    expect(page.getAdjustButton("Leche")).toHaveAttribute("aria-expanded", "false");
  });

  it("con No vence, el producto pasa a Sin fecha estimada sin días", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([itemOutInDays("Leche", 3)])
      .mockResolvedValueOnce([itemOutInDays("Leche", null)]);
    adjustMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.NO_EXPIRY);

    expect(adjustMock).toHaveBeenCalledWith("variant-Leche", SHELF_LIFE_CHOICE.NO_EXPIRY);
    await waitFor(() => expect(page.getGroupTitles()).toEqual(["Sin fecha estimada"]));
    expect(within(page.getRowOf("Leche")).queryByText(/Te qued|Se acaba/u)).toBeNull();
  });

  it("después de un chip, avisa al lector de pantalla y el foco vuelve a Ajustar fecha en su grupo nuevo", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([itemOutInDays("Leche", 3)])
      .mockResolvedValueOnce([itemOutInDays("Leche", 60)]);
    adjustMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS);

    await waitFor(() => expect(page.getGroupTitles()).toEqual(["Más adelante"]));
    expect(page.getAnnouncement()).toHaveTextContent("Leche: fecha actualizada.");
    await waitFor(() => expect(page.getAdjustButton("Leche")).toHaveFocus());
  });

  it("si el chip se guarda pero falla la recarga, la lista sigue y solo esa fila avisa", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([itemOutInDays("Leche", 3), itemOutInDays("Café", 20)])
      .mockRejectedValueOnce(new Error("network"));
    adjustMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);

    const alert = await page.findError();
    expect(alert).toHaveTextContent("Se guardó, pero no se pudo actualizar la pantalla. Recarga la página.");
    expect(page.getRowOf("Leche")).toContainElement(alert);
    expect(page.queryProduct("Café")).toBeTruthy();
    expect(page.getGroupTitles()).toEqual(["Vence pronto", "Este mes"]);
  });

  it("Ajustar fecha abre y cierra los chips de ese producto", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3), itemOutInDays("Café", 20)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");

    expect(page.getAdjustButton("Leche")).toHaveAttribute("aria-expanded", "true");
    expect(page.queryChips("Leche")).toBeTruthy();
    expect(page.queryChips("Café")).toBeNull();

    await page.toggleAdjust("Leche");

    expect(page.queryChips("Leche")).toBeNull();
  });

  it("elegir un chip guarda, vuelve a pedir el inventario y cierra los chips (CA-02)", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([itemOutInDays("Leche", 3)])
      .mockResolvedValueOnce([itemOutInDays("Leche", 21)]);
    adjustMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS);

    expect(adjustMock).toHaveBeenCalledWith("variant-Leche", SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS);
    await waitFor(() => expect(page.getGroupTitles()).toEqual(["Este mes"]));
    expect(within(page.getGroup("thisMonth")).getByText("Te quedan 21 días")).toBeTruthy();
    expect(page.queryChips("Leche")).toBeNull();
    expect(getMyInventoryMock).toHaveBeenCalledTimes(2);
  });

  it("si el chip no se guarda, los chips siguen abiertos con el error", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3)]);
    adjustMock.mockRejectedValue(new Error("network"));
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);

    const chips = page.queryChips("Leche");
    expect(chips).toBeTruthy();
    expect(await page.findError()).toHaveTextContent("No se pudo guardar. Intenta de nuevo.");
    expect(getMyInventoryMock).toHaveBeenCalledTimes(1);
  });

  it("mientras guarda un chip, los botones de ese producto quedan deshabilitados", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3), itemOutInDays("Café", 20)]);
    adjustMock.mockReturnValue(new Promise(() => {}));
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);

    expect(page.getUsedUpButton("Leche")).toBeDisabled();
    expect(page.getAdjustButton("Leche")).toBeDisabled();
    expect(page.getUsedUpButton("Café")).toBeEnabled();
  });

  it("dos ajustes seguidos del mismo producto se avisan los dos (OBS-2 de la PR #124)", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3)]);
    adjustMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);
    await waitFor(() => expect(page.getAnnouncement()).toHaveTextContent("Leche: fecha actualizada."));
    const firstAnnouncement = page.getAnnouncement().textContent;

    await page.toggleAdjust("Leche");
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);
    await waitFor(() => expect(adjustMock).toHaveBeenCalledTimes(2));

    // Mismo mensaje, pero el texto de la región cambia: el lector lo vuelve a leer.
    await waitFor(() => expect(page.getAnnouncement().textContent).not.toBe(firstAnnouncement));
    expect(page.getAnnouncement()).toHaveTextContent("Leche: fecha actualizada.");
  });
});

describe("MyInventory: agregar a mano (SCRUM-107)", () => {
  const openPanelAndPickLeche = async (page: ReturnType<typeof createMyInventoryPage>): Promise<void> => {
    await page.openAdd();
    await page.searchProduct("le");
    await page.chooseSearchOption("Leche", "500 ml");
  };

  it("el botón está con productos y también en el estado vacío, no mientras carga", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    render(<MyInventory />);
    const page = createMyInventoryPage();

    // Mientras carga, todavía no.
    expect(page.queryOpenAddButton()).toBeNull();
    await page.findEmptyState();
    // CA-04 de SCRUM-105: el texto del vacío no pide llenarlo a mano; el botón está, sin insistir.
    expect(await page.findOpenAddButton()).toBeTruthy();
  });

  it("si el inventario no carga, no ofrece agregar", async () => {
    getMyInventoryMock.mockRejectedValue(new Error("network"));
    render(<MyInventory />);
    const page = createMyInventoryPage();

    await page.findError();

    expect(page.queryOpenAddButton()).toBeNull();
  });

  it("abre el panel con el foco en su título y Cancelar lo cierra devolviendo el foco al botón", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Café", 20)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.openAdd();

    expect(page.getAddPanelTitle()).toHaveFocus();
    expect(page.queryOpenAddButton()).toBeNull();

    await page.cancelAdd();

    expect(page.queryAddPanel()).toBeNull();
    expect(await page.findOpenAddButton()).toHaveFocus();
    expect(addMock).not.toHaveBeenCalled();
  });

  it("busca en el catálogo y muestra una opción por presentación", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findEmptyState();

    await page.openAdd();
    await page.searchProduct("le");

    expect(await page.findSearchOption("Leche", "1000 ml")).toBeTruthy();
    expect(await page.findSearchOption("Leche", "500 ml")).toBeTruthy();
    expect(searchCatalogMock).toHaveBeenCalledWith("le");
  });

  it("agrega con el chip elegido, cierra el panel y el producto aparece como cualquier otro (CA-01, CA-02)", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([itemOutInDays("Café", 20)])
      .mockResolvedValueOnce([itemOutInDays("Café", 20), { ...itemOutInDays("Leche", 21), variantId: "variant-Leche-500" }]);
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    addMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await openPanelAndPickLeche(page);
    expect(within(page.getAddPanel()).getByText("500 ml")).toBeTruthy();
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS);
    await page.confirmAdd();

    expect(addMock).toHaveBeenCalledWith("variant-Leche-500", SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS);
    expect(page.queryAddPanel()).toBeNull();
    await waitFor(() => expect(within(page.getGroup("thisMonth")).getByText("Leche")).toBeTruthy());
    expect(within(page.getRowOf("Leche")).getByText("Te quedan 21 días")).toBeTruthy();
    expect(page.getAnnouncement()).toHaveTextContent("Leche se agregó a tu inventario.");
    await waitFor(() => expect(page.getAdjustButton("Leche")).toHaveFocus());
  });

  it("el chip es opcional: sin chip agrega igual, y tocar el chip elegido lo quita", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    addMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findEmptyState();

    await openPanelAndPickLeche(page);
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.FEW_DAYS);
    await page.confirmAdd();

    expect(addMock).toHaveBeenCalledWith("variant-Leche-500", null);
  });

  it("Cambiar producto vuelve al buscador", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findEmptyState();

    await openPanelAndPickLeche(page);
    await page.changeProduct();

    expect(within(page.getAddPanel()).getByRole("combobox", { name: PRODUCT_SEARCH_TEXT.LABEL })).toBeTruthy();
    expect(within(page.getAddPanel()).queryByRole("button", { name: MY_INVENTORY_TEXT.ADD_CONFIRM })).toBeNull();
  });

  it("si no se puede agregar, el panel sigue abierto con el error", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    addMock.mockRejectedValue(new Error("network"));
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findEmptyState();

    await openPanelAndPickLeche(page);
    await page.confirmAdd();

    expect(await within(page.getAddPanel()).findByRole("alert")).toHaveTextContent(
      "No se pudo agregar. Intenta de nuevo.",
    );
    expect(getMyInventoryMock).toHaveBeenCalledTimes(1);
  });

  it("si se agregó pero falla la recarga, la lista sigue y la pantalla avisa", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([itemOutInDays("Café", 20)])
      .mockRejectedValueOnce(new Error("network"));
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    addMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await openPanelAndPickLeche(page);
    await page.confirmAdd();

    expect(await page.findError()).toHaveTextContent(
      "Se guardó, pero no se pudo actualizar la pantalla. Recarga la página.",
    );
    expect(page.queryProduct("Café")).toBeTruthy();
  });

  it("si se marcó Ya se acabó y se vuelve a agregar en la misma pantalla, aparece", async () => {
    getMyInventoryMock
      .mockResolvedValueOnce([{ ...itemOutInDays("Leche", 3), variantId: "variant-Leche-500" }])
      .mockResolvedValueOnce([{ ...itemOutInDays("Leche", 60), variantId: "variant-Leche-500" }]);
    markUsedUpMock.mockResolvedValue();
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    addMock.mockResolvedValue();
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.markUsedUp("Leche");
    expect(await page.findEmptyState()).toBeTruthy();
    await openPanelAndPickLeche(page);
    await page.chooseChip("Leche", SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS);
    await page.confirmAdd();

    await waitFor(() => expect(within(page.getGroup("later")).getByText("Leche")).toBeTruthy());
    await waitFor(() => expect(page.getAdjustButton("Leche")).toHaveFocus());
  });
  it("abrir el panel cierra los chips de Ajustar fecha", async () => {
    getMyInventoryMock.mockResolvedValue([itemOutInDays("Leche", 3)]);
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findGroups();

    await page.toggleAdjust("Leche");
    await page.openAdd();

    expect(page.queryChips("Leche")).toBeNull();
    expect(page.getAdjustButton("Leche")).toHaveAttribute("aria-expanded", "false");
  });

  it("mientras agrega, Agregar y Cancelar quedan deshabilitados", async () => {
    getMyInventoryMock.mockResolvedValue([]);
    searchCatalogMock.mockResolvedValue([LECHE_IN_CATALOG]);
    addMock.mockReturnValue(new Promise(() => {}));
    render(<MyInventory />);
    const page = createMyInventoryPage();
    await page.findEmptyState();

    await openPanelAndPickLeche(page);
    await page.confirmAdd();

    expect(within(page.getAddPanel()).getByRole("button", { name: MY_INVENTORY_TEXT.ADD_CONFIRM })).toBeDisabled();
    expect(within(page.getAddPanel()).getByRole("button", { name: MY_INVENTORY_TEXT.ADD_CANCEL })).toBeDisabled();
    expect(addMock).toHaveBeenCalledTimes(1);
  });
});

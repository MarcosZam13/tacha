// @vitest-environment jsdom
import { cleanup, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { MyInventory } from "../MyInventory";
import type { InventoryItem } from "../models/InventoryItem.interface";
import { SHELF_LIFE_CHOICE } from "@/features/shopping-list/constants/shelf-life.constants";
import { adjustInventoryItem, getMyInventory, markInventoryItemUsedUp } from "../services/my-inventory.service";
import { createMyInventoryPage } from "./MyInventory.page";

// Sin Supabase real: el inventario sale de un servicio simulado.
vi.mock("../services/my-inventory.service", () => ({
  adjustInventoryItem: vi.fn(),
  getMyInventory: vi.fn(),
  markInventoryItemUsedUp: vi.fn(),
}));
const getMyInventoryMock = vi.mocked(getMyInventory);
const markUsedUpMock = vi.mocked(markInventoryItemUsedUp);
const adjustMock = vi.mocked(adjustInventoryItem);

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
});

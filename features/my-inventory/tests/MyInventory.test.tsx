// @vitest-environment jsdom
import { cleanup, render, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE } from "@/constants";
import { MyInventory } from "../MyInventory";
import type { InventoryItem } from "../models/InventoryItem.interface";
import { getMyInventory } from "../services/my-inventory.service";
import { createMyInventoryPage } from "./MyInventory.page";

// Sin Supabase real: el inventario sale de un servicio simulado.
vi.mock("../services/my-inventory.service", () => ({ getMyInventory: vi.fn() }));
const getMyInventoryMock = vi.mocked(getMyInventory);

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

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPriceDisclaimerPage } from "@/components/price-disclaimer/tests/PriceDisclaimer.page";
import { ShoppingListItemDetail } from "../components/ShoppingListItemDetail";
import { SHOPPING_LIST_TEXT } from "../constants/shopping-list.constants";
import type { ItemDetailViewModel } from "../models/ItemDetailViewModel.interface";

// Sin globals, Testing Library no limpia solo el DOM entre tests.
afterEach(cleanup);

const createDetail = (overrides: Partial<ItemDetailViewModel> = {}): ItemDetailViewModel => ({
  brands: ["Dos Pinos"],
  errorMessage: null,
  isLoading: false,
  priceRows: [
    { priceLabel: "₡1 200 – ₡1 500", storeName: "MaxiPali" },
    { priceLabel: "₡1 300", storeName: "Walmart" },
  ],
  productName: "Leche",
  sizeLabel: "1000 ml",
  ...overrides,
});

// El bloque "Precio de referencia por supermercado": su título y su lista.
const getPricesSection = () =>
  screen.getByRole("heading", { level: 3, name: SHOPPING_LIST_TEXT.DETAIL_PRICES }).closest("section");

// SCRUM-75 (P1): en /lista, el aviso va dentro del detalle, justo debajo de los precios.
describe("ShoppingListItemDetail: price disclaimer", () => {
  it("shows the notice once, right below «Precio de referencia por supermercado» (CA-01, CA-02)", () => {
    render(<ShoppingListItemDetail detail={createDetail()} onClose={vi.fn()} />);
    const disclaimer = createPriceDisclaimerPage();

    expect(disclaimer.queryAllDisclaimers()).toHaveLength(1);
    // Inmediatamente después de la sección de precios, no dentro de una fila.
    expect(getPricesSection()?.nextElementSibling).toBe(disclaimer.getDisclaimer());
  });

  it("also shows it when there are no reference prices yet", () => {
    render(<ShoppingListItemDetail detail={createDetail({ priceRows: [] })} onClose={vi.fn()} />);
    const disclaimer = createPriceDisclaimerPage();

    expect(getPricesSection()?.nextElementSibling).toBe(disclaimer.getDisclaimer());
  });

  it("does not show it while the prices are loading or failed, because the prices are not shown", () => {
    const { rerender } = render(
      <ShoppingListItemDetail detail={createDetail({ isLoading: true, priceRows: [] })} onClose={vi.fn()} />,
    );
    const disclaimer = createPriceDisclaimerPage();

    expect(disclaimer.queryAllDisclaimers()).toHaveLength(0);

    rerender(<ShoppingListItemDetail detail={createDetail({ errorMessage: "No se pudo cargar." })} onClose={vi.fn()} />);
    expect(disclaimer.queryAllDisclaimers()).toHaveLength(0);
  });
});

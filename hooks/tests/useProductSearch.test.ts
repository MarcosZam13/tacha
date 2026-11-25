// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PRODUCT_SEARCH } from "@/constants";
import { searchCatalog } from "@/services/catalog.service";
import type { CatalogProduct } from "@/types/catalog.types";
import { useProductSearch } from "../useProductSearch";

vi.mock("@/services/catalog.service", () => ({ searchCatalog: vi.fn() }));

const searchCatalogMock = vi.mocked(searchCatalog);

const LECHE: CatalogProduct = {
  category: "Lácteos",
  productId: "product-1",
  productName: "Leche",
  variants: [],
};

// Escribe el término y deja pasar el debounce; act espera la promesa resuelta.
const typeAndWait = async (result: { current: ReturnType<typeof useProductSearch> }, text: string) => {
  act(() => result.current.setQuery(text));
  await act(async () => {
    await vi.advanceTimersByTimeAsync(PRODUCT_SEARCH.DEBOUNCE_MS);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  searchCatalogMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("useProductSearch", () => {
  it("searches the global catalog by default", async () => {
    searchCatalogMock.mockResolvedValue([LECHE]);
    const { result } = renderHook(() => useProductSearch());

    await typeAndWait(result, "leche");

    expect(searchCatalogMock).toHaveBeenCalledWith("leche");
    expect(result.current.results).toEqual([LECHE]);
  });

  // SCRUM-110: el editor de grupos busca también en los productos propios.
  it("uses the search function it receives instead of the global catalog", async () => {
    const searchOwnProducts = vi.fn().mockResolvedValue([LECHE]);
    const { result } = renderHook(() => useProductSearch(searchOwnProducts));

    await typeAndWait(result, "leche");

    expect(searchOwnProducts).toHaveBeenCalledWith("leche");
    expect(searchCatalogMock).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([LECHE]);
  });

  it("does not search with fewer letters than the minimum", async () => {
    const { result } = renderHook(() => useProductSearch());

    await typeAndWait(result, "l");

    expect(searchCatalogMock).not.toHaveBeenCalled();
    expect(result.current.isSearching).toBe(false);
  });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PERSONAL_PRODUCT_DELETE_RESULT } from "@/constants/create-product-form.constants";
import { deletePersonalProduct, getPersonalProductUsage } from "@/services/personal-product.service";
import { MY_PRODUCT_DELETE_TEXT } from "../constants/my-products.constants";
import { useMyProductDeletion } from "../hooks/useMyProductDeletion";

vi.mock("@/services/personal-product.service", () => ({
  deletePersonalProduct: vi.fn(),
  getPersonalProductUsage: vi.fn(),
}));

const deletePersonalProductMock = vi.mocked(deletePersonalProduct);
const getPersonalProductUsageMock = vi.mocked(getPersonalProductUsage);

const PRODUCT = { name: "Queso casero", productId: "product-7" };

afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
  getPersonalProductUsageMock.mockResolvedValue({ activeListCount: 0, groupCount: 0, recipeCount: 0 });
});

// HU-58 (SCRUM-89) CA-02: eliminar siempre pide confirmación; si se usa, avisa dónde.
describe("useMyProductDeletion", () => {
  it("opens the dialog with the product name and counts where it is used", async () => {
    getPersonalProductUsageMock.mockResolvedValue({ activeListCount: 2, groupCount: 0, recipeCount: 1 });
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted: vi.fn() }));

    act(() => result.current.onDeleteRequest(PRODUCT));

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.productName).toBe("Queso casero");
    await waitFor(() => expect(result.current.usageNotice).toContain("2 listas activas y 1 receta"));
    expect(getPersonalProductUsageMock).toHaveBeenCalledWith("product-7");
  });

  it("does not delete anything until the user confirms", () => {
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted: vi.fn() }));

    act(() => result.current.onDeleteRequest(PRODUCT));

    expect(deletePersonalProductMock).not.toHaveBeenCalled();
  });

  it("deletes on confirm, closes the dialog and notifies", async () => {
    deletePersonalProductMock.mockResolvedValue(PERSONAL_PRODUCT_DELETE_RESULT.ARCHIVED);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted }));
    act(() => result.current.onDeleteRequest(PRODUCT));

    await act(async () => result.current.onDeleteConfirm());

    expect(deletePersonalProductMock).toHaveBeenCalledWith("product-7");
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(result.current.isDialogOpen).toBe(false);
  });

  it("keeps the dialog open with an error when deleting fails", async () => {
    deletePersonalProductMock.mockRejectedValue({ code: "500", message: "boom" });
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted }));
    act(() => result.current.onDeleteRequest(PRODUCT));

    await act(async () => result.current.onDeleteConfirm());

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.errorMessage).toBe(MY_PRODUCT_DELETE_TEXT.ERROR);
    expect(onDeleted).not.toHaveBeenCalled();
  });

  // SPEC §7: si eliminar falla, "Eliminar" reintenta con el mismo producto.
  it("retries with the same product after a failed delete", async () => {
    deletePersonalProductMock
      .mockRejectedValueOnce({ code: "500", message: "boom" })
      .mockResolvedValueOnce(PERSONAL_PRODUCT_DELETE_RESULT.DELETED);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted }));
    act(() => result.current.onDeleteRequest(PRODUCT));
    await act(async () => result.current.onDeleteConfirm());

    await act(async () => result.current.onDeleteConfirm());

    expect(deletePersonalProductMock).toHaveBeenCalledTimes(2);
    expect(deletePersonalProductMock).toHaveBeenLastCalledWith("product-7");
    expect(onDeleted).toHaveBeenCalledTimes(1);
    expect(result.current.isDialogOpen).toBe(false);
  });

  // SPEC §7: sin conteo no hay aviso, pero eliminar sigue funcionando.
  it("still opens without a notice and deletes when the usage cannot be counted", async () => {
    getPersonalProductUsageMock.mockRejectedValue(new Error("network"));
    deletePersonalProductMock.mockResolvedValue(PERSONAL_PRODUCT_DELETE_RESULT.DELETED);
    const onDeleted = vi.fn();
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted }));

    act(() => result.current.onDeleteRequest(PRODUCT));
    await waitFor(() => expect(getPersonalProductUsageMock).toHaveBeenCalled());
    // Deja que se procese el rechazo del conteo antes de mirar el aviso.
    await act(async () => {});

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.usageNotice).toBeNull();

    await act(async () => result.current.onDeleteConfirm());

    expect(deletePersonalProductMock).toHaveBeenCalledWith("product-7");
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });

  it("closes on cancel without deleting", () => {
    const { result } = renderHook(() => useMyProductDeletion({ onDeleted: vi.fn() }));
    act(() => result.current.onDeleteRequest(PRODUCT));

    act(() => result.current.onDeleteCancel());

    expect(result.current.isDialogOpen).toBe(false);
    expect(deletePersonalProductMock).not.toHaveBeenCalled();
  });
});

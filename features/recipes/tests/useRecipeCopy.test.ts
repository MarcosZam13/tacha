// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecipeCopy } from "../hooks/useRecipeCopy";
import { copyRecipe } from "../services/recipe-sharing.service";

vi.mock("../services/recipe-sharing.service", () => ({ copyRecipe: vi.fn() }));
const copyMock = vi.mocked(copyRecipe);
const onCopied = vi.fn();

const renderCopy = () => renderHook(() => useRecipeCopy({ onCopied })).result;

beforeEach(() => vi.resetAllMocks());

describe("useRecipeCopy", () => {
  it("copies and tells the catalog, only in that card", async () => {
    copyMock.mockResolvedValue(true);
    const result = renderCopy();

    await act(async () => result.current.onCopyRequest("flan"));

    expect(onCopied).toHaveBeenCalledTimes(1);
    expect(result.current.getRecipeCopy("flan").successMessage).toBe("Guardamos una copia personal.");
    expect(result.current.getRecipeCopy("arroz").successMessage).toBeNull();
  });

  it("makes one copy with a double click", async () => {
    let finish: (isCopied: boolean) => void = () => undefined;
    copyMock.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const result = renderCopy();

    act(() => {
      result.current.onCopyRequest("flan");
      result.current.onCopyRequest("flan");
    });
    expect(result.current.getRecipeCopy("flan").isCopying).toBe(true);
    await act(async () => finish(true));

    expect(copyMock).toHaveBeenCalledTimes(1);
  });

  it("says the recipe is gone", async () => {
    copyMock.mockResolvedValue(false);
    const result = renderCopy();

    await act(async () => result.current.onCopyRequest("flan"));

    expect(result.current.getRecipeCopy("flan").errorMessage).toBe("No encontramos esa receta.");
    expect(onCopied).not.toHaveBeenCalled();
  });

  it("can be tried again after failing", async () => {
    copyMock.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce(true);
    const result = renderCopy();

    await act(async () => result.current.onCopyRequest("flan"));
    expect(result.current.getRecipeCopy("flan").errorMessage).toBe("No se pudo guardar la copia. Intenta de nuevo.");
    await act(async () => result.current.onCopyRequest("flan"));

    expect(result.current.getRecipeCopy("flan")).toEqual({
      errorMessage: null,
      isCopying: false,
      successMessage: "Guardamos una copia personal.",
    });
  });
});

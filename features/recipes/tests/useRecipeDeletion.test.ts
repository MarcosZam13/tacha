// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useRecipeDeletion } from "../hooks/useRecipeDeletion";
import { countRecipeMealPlans, deleteRecipe } from "../services/recipes.service";

vi.mock("../services/recipes.service", () => ({
  countRecipeMealPlans: vi.fn(),
  deleteRecipe: vi.fn(),
}));
const countMock = vi.mocked(countRecipeMealPlans);
const deleteMock = vi.mocked(deleteRecipe);

const FLAN = { id: "recipe-flan", name: "Flan" };
const ARROZ = { id: "recipe-arroz", name: "Arroz con leche" };

const onDeletedMock = vi.fn();

/** Una respuesta de la base que el test decide cuándo llega. */
const createPendingCount = () => {
  let resolve: (count: number) => void = () => undefined;
  const promise = new Promise<number>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

beforeEach(() => {
  vi.resetAllMocks();
  countMock.mockResolvedValue(0);
  deleteMock.mockResolvedValue({ recipeId: FLAN.id });
});

describe("useRecipeDeletion: the meal plan notice", () => {
  it("starts closed without a notice", () => {
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.mealPlanNotice).toBeNull();
    expect(countMock).not.toHaveBeenCalled();
  });

  it("opens the dialog and counts the plan slots that use the recipe", async () => {
    countMock.mockResolvedValue(3);
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));

    act(() => result.current.onDeleteRequest(FLAN));

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.recipeName).toBe("Flan");
    await waitFor(() => expect(result.current.mealPlanNotice).toBe("Está en 3 espacios de tu plan; quedarán vacíos."));
    expect(countMock).toHaveBeenCalledWith("recipe-flan");
  });

  it("uses the singular for one slot", async () => {
    countMock.mockResolvedValue(1);
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));

    act(() => result.current.onDeleteRequest(FLAN));

    await waitFor(() => expect(result.current.mealPlanNotice).toBe("Está en 1 espacio de tu plan; quedará vacío."));
  });

  it("shows no notice when the recipe is not in the plan", async () => {
    countMock.mockResolvedValue(0);
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));

    act(() => result.current.onDeleteRequest(FLAN));
    await waitFor(() => expect(countMock).toHaveBeenCalledTimes(1));
    await act(async () => undefined);

    expect(result.current.mealPlanNotice).toBeNull();
  });

  it("shows no notice while it is still counting", () => {
    countMock.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));

    act(() => result.current.onDeleteRequest(FLAN));

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.mealPlanNotice).toBeNull();
  });

  it("opens without a notice, and deleting still works, when the count fails", async () => {
    countMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));

    act(() => result.current.onDeleteRequest(FLAN));
    await waitFor(() => expect(countMock).toHaveBeenCalledTimes(1));
    await act(async () => undefined);
    expect(result.current.mealPlanNotice).toBeNull();
    expect(result.current.isDialogOpen).toBe(true);

    await act(async () => result.current.onDeleteConfirm());

    expect(deleteMock).toHaveBeenCalledWith({ recipeId: "recipe-flan" });
    expect(onDeletedMock).toHaveBeenCalledWith("recipe-flan");
    expect(result.current.isDialogOpen).toBe(false);
  });

  it("does not keep the notice of the previous recipe when another one is requested", async () => {
    countMock.mockResolvedValueOnce(3);
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));
    act(() => result.current.onDeleteRequest(FLAN));
    await waitFor(() => expect(result.current.mealPlanNotice).not.toBeNull());
    act(() => result.current.onDeleteCancel());
    const pending = createPendingCount();
    countMock.mockReturnValueOnce(pending.promise);

    act(() => result.current.onDeleteRequest(ARROZ));

    expect(result.current.mealPlanNotice).toBeNull();
    await act(async () => pending.resolve(2));
    expect(result.current.mealPlanNotice).toBe("Está en 2 espacios de tu plan; quedarán vacíos.");
  });

  it("ignores a count that arrives after the dialog was closed", async () => {
    const pending = createPendingCount();
    countMock.mockReturnValue(pending.promise);
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));
    act(() => result.current.onDeleteRequest(FLAN));

    act(() => result.current.onDeleteCancel());
    await act(async () => pending.resolve(5));

    expect(result.current.mealPlanNotice).toBeNull();
  });

  it("asks for the count once per request, not on every change of the dialog state", async () => {
    countMock.mockResolvedValue(2);
    deleteMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderHook(() => useRecipeDeletion({ onDeleted: onDeletedMock }));
    act(() => result.current.onDeleteRequest(FLAN));
    await waitFor(() => expect(result.current.mealPlanNotice).not.toBeNull());

    await act(async () => result.current.onDeleteConfirm());

    expect(result.current.errorMessage).not.toBeNull();
    expect(countMock).toHaveBeenCalledTimes(1);
  });
});

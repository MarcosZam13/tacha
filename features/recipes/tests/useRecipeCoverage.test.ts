// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NullableRef } from "@/types/nullable.types";
import { RECIPE_COVERAGE_STATUS, RECIPE_COVERAGE_TEXT } from "../constants/recipes.constants";
import { useRecipeCoverage } from "../hooks/useRecipeCoverage";
import type { CoverageIngredient, RecipeCoverageViewModel } from "../models/recipe-coverage.interfaces";
import { getRecipeCoverage, subscribeToListChanges } from "../services/recipe-coverage.service";

vi.mock("../services/recipe-coverage.service", () => ({
  getRecipeCoverage: vi.fn(),
  subscribeToListChanges: vi.fn(),
}));
const getRecipeCoverageMock = vi.mocked(getRecipeCoverage);
const subscribeToListChangesMock = vi.mocked(subscribeToListChanges);

const RECIPE_ID = "recipe-tres-leches";
const OTHER_RECIPE_ID = "recipe-flan";

const createIngredient = (id: string, isCovered: boolean): CoverageIngredient => ({
  id,
  isCovered,
  name: id,
  quantityLabel: "800 ml",
  reasonText: isCovered ? null : RECIPE_COVERAGE_TEXT.REASON_NOT_CHECKED,
  statusLabel: isCovered ? RECIPE_COVERAGE_TEXT.COVERED : RECIPE_COVERAGE_TEXT.MISSING,
});

// Lo que la base devuelve antes y después de tachar la leche.
const LECHE_PENDING = createIngredient("leche", false);
const LECHE_CHECKED = createIngredient("leche", true);
const SAL_COVERED = createIngredient("sal", true);

/** Una respuesta de la base que el test decide cuándo llega. */
const createPendingCoverage = () => {
  let resolve: (ingredients: NullableRef<CoverageIngredient[]>) => void = () => undefined;
  const promise = new Promise<NullableRef<CoverageIngredient[]>>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

// Lo que hace Realtime: avisa de un cambio en list_items. Se asigna cuando el hook se suscribe.
let notifyListChange: () => void = () => undefined;
const unsubscribeMock = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  notifyListChange = () => undefined;
  subscribeToListChangesMock.mockImplementation(async (onChange) => {
    notifyListChange = onChange;
    return unsubscribeMock;
  });
});

const openRecipe = (recipeId: string, hook: { result: { current: RecipeCoverageViewModel } }): void => {
  act(() => {
    hook.result.current.onCoverageToggle(recipeId);
  });
};

const renderOpenedRecipe = async (firstResponse: NullableRef<CoverageIngredient[]> = [LECHE_PENDING, SAL_COVERED]) => {
  getRecipeCoverageMock.mockResolvedValueOnce(firstResponse);
  const hook = renderHook(() => useRecipeCoverage());
  openRecipe(RECIPE_ID, hook);
  await waitFor(() =>
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).not.toBe(RECIPE_COVERAGE_STATUS.LOADING),
  );
  return hook;
};

describe("useRecipeCoverage", () => {
  it("shows the panel loading and then the ingredients with their summary", async () => {
    const response = createPendingCoverage();
    getRecipeCoverageMock.mockReturnValueOnce(response.promise);
    const hook = renderHook(() => useRecipeCoverage());

    openRecipe(RECIPE_ID, hook);
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.LOADING);

    await act(async () => response.resolve([LECHE_PENDING, SAL_COVERED]));

    const coverage = hook.result.current.getRecipeCoverage(RECIPE_ID);
    expect(coverage.panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY);
    expect(coverage.ingredients).toEqual([LECHE_PENDING, SAL_COVERED]);
    expect(coverage.summaryText).toBe("Te falta 1 de 2 ingredientes");
    expect(getRecipeCoverageMock).toHaveBeenCalledWith({ recipeId: RECIPE_ID });
  });

  it("leaves the panel of every other recipe closed", async () => {
    const { result } = await renderOpenedRecipe();

    expect(result.current.getRecipeCoverage(OTHER_RECIPE_ID).panelStatus).toBeNull();
  });

  it("shows the not found message when the recipe is gone", async () => {
    const { result } = await renderOpenedRecipe(null);

    const coverage = result.current.getRecipeCoverage(RECIPE_ID);
    expect(coverage.panelStatus).toBe(RECIPE_COVERAGE_STATUS.NOT_FOUND);
    expect(coverage.messageText).toBe(RECIPE_COVERAGE_TEXT.NOT_FOUND);
  });

  it("shows the error, never the all-covered summary, when the first load fails, and retry loads it", async () => {
    getRecipeCoverageMock.mockRejectedValueOnce(new Error("network"));
    const hook = renderHook(() => useRecipeCoverage());

    openRecipe(RECIPE_ID, hook);
    await waitFor(() =>
      expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.ERROR),
    );
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).messageText).toBe(RECIPE_COVERAGE_TEXT.ERROR);
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).summaryText).toBeNull();

    getRecipeCoverageMock.mockResolvedValueOnce([LECHE_CHECKED]);
    act(() => {
      hook.result.current.onCoverageRetry();
    });
    await waitFor(() =>
      expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY),
    );
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).summaryText).toBe(RECIPE_COVERAGE_TEXT.ALL_COVERED);
  });

  it("asks the database again when the list changes, without going back to loading", async () => {
    const { result } = await renderOpenedRecipe([LECHE_PENDING, SAL_COVERED]);
    getRecipeCoverageMock.mockResolvedValueOnce([LECHE_CHECKED, SAL_COVERED]);

    act(() => notifyListChange());

    // El panel no parpadea: mientras llega la respuesta se sigue viendo lo anterior.
    expect(result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY);
    await waitFor(() => expect(result.current.getRecipeCoverage(RECIPE_ID).summaryText).toBe(RECIPE_COVERAGE_TEXT.ALL_COVERED));
    expect(getRecipeCoverageMock).toHaveBeenCalledTimes(2);
  });

  it("makes only one more request when several changes arrive while one is running", async () => {
    const { result } = await renderOpenedRecipe([LECHE_PENDING, SAL_COVERED]);
    const runningResponse = createPendingCoverage();
    getRecipeCoverageMock.mockReturnValueOnce(runningResponse.promise);
    getRecipeCoverageMock.mockResolvedValue([LECHE_CHECKED, SAL_COVERED]);

    act(() => {
      notifyListChange();
      notifyListChange();
      notifyListChange();
    });
    // La primera consulta salió; las otras dos señales quedaron en espera.
    expect(getRecipeCoverageMock).toHaveBeenCalledTimes(2);

    await act(async () => runningResponse.resolve([LECHE_PENDING, SAL_COVERED]));

    await waitFor(() => expect(result.current.getRecipeCoverage(RECIPE_ID).summaryText).toBe(RECIPE_COVERAGE_TEXT.ALL_COVERED));
    expect(getRecipeCoverageMock).toHaveBeenCalledTimes(3);
  });

  it("keeps what was on screen when an update fails", async () => {
    const { result } = await renderOpenedRecipe([LECHE_PENDING, SAL_COVERED]);
    getRecipeCoverageMock.mockRejectedValueOnce(new Error("network"));

    act(() => notifyListChange());
    await waitFor(() => expect(getRecipeCoverageMock).toHaveBeenCalledTimes(2));
    await act(async () => undefined);

    const coverage = result.current.getRecipeCoverage(RECIPE_ID);
    expect(coverage.panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY);
    expect(coverage.ingredients).toEqual([LECHE_PENDING, SAL_COVERED]);
  });

  it("closes the panel and cancels the subscription when its button is pressed again", async () => {
    const hook = await renderOpenedRecipe();

    openRecipe(RECIPE_ID, hook);

    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBeNull();
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
  });

  it("opens one panel at a time: opening another closes the first and cancels its subscription", async () => {
    const hook = await renderOpenedRecipe();
    getRecipeCoverageMock.mockResolvedValueOnce([SAL_COVERED]);

    openRecipe(OTHER_RECIPE_ID, hook);

    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBeNull();
    expect(hook.result.current.getRecipeCoverage(OTHER_RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.LOADING);
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(hook.result.current.getRecipeCoverage(OTHER_RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY),
    );
  });

  it("ignores the answer that arrives after the panel was closed", async () => {
    const response = createPendingCoverage();
    getRecipeCoverageMock.mockReturnValueOnce(response.promise);
    const hook = renderHook(() => useRecipeCoverage());
    openRecipe(RECIPE_ID, hook);
    openRecipe(RECIPE_ID, hook);

    await act(async () => response.resolve([LECHE_PENDING]));

    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBeNull();
  });

  it("closes the panel of a recipe that was deleted, and only that one", async () => {
    const hook = await renderOpenedRecipe();

    act(() => hook.result.current.onRecipeRemoved(OTHER_RECIPE_ID));
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY);

    act(() => hook.result.current.onRecipeRemoved(RECIPE_ID));
    expect(hook.result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBeNull();
    await waitFor(() => expect(unsubscribeMock).toHaveBeenCalledTimes(1));
  });

  it("keeps working when the subscription fails", async () => {
    subscribeToListChangesMock.mockRejectedValueOnce(new Error("realtime"));

    const { result } = await renderOpenedRecipe([LECHE_CHECKED]);

    expect(result.current.getRecipeCoverage(RECIPE_ID).panelStatus).toBe(RECIPE_COVERAGE_STATUS.READY);
  });
});

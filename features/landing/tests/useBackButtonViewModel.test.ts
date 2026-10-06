// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANDING_ROUTE } from "../constants/landing.constants";
import { useBackButtonViewModel } from "../hooks/useBackButtonViewModel";

// vi.mock se ejecuta antes que los imports: los mocks se crean con vi.hoisted
// para que ya existan cuando corre.
const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

// jsdom no trae la Navigation API: se simula solo en los tests que la necesitan.
const setNavigation = (canGoBack: boolean): void => {
  Object.defineProperty(window, "navigation", { configurable: true, value: { canGoBack } });
};

describe("useBackButtonViewModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Reflect.deleteProperty(window, "navigation");
    vi.restoreAllMocks();
  });

  it("goes back when there is a previous page of the app", () => {
    setNavigation(true);
    const { result } = renderHook(() => useBackButtonViewModel());

    result.current.goBack();

    expect(back).toHaveBeenCalled();
  });

  it("goes home when the page was opened directly in a new tab", () => {
    setNavigation(false);
    const { result } = renderHook(() => useBackButtonViewModel());

    result.current.goBack();

    expect(push).toHaveBeenCalledWith(LANDING_ROUTE.HOME);
    expect(back).not.toHaveBeenCalled();
  });

  it("goes back without the Navigation API when the visitor came from a page of the app", () => {
    vi.spyOn(Document.prototype, "referrer", "get").mockReturnValue(`${window.location.origin}/nosotros`);
    const { result } = renderHook(() => useBackButtonViewModel());

    result.current.goBack();

    expect(back).toHaveBeenCalled();
  });

  it("goes home without the Navigation API when the visitor came from another site", () => {
    vi.spyOn(Document.prototype, "referrer", "get").mockReturnValue("https://www.google.com/");
    const { result } = renderHook(() => useBackButtonViewModel());

    result.current.goBack();

    expect(push).toHaveBeenCalledWith(LANDING_ROUTE.HOME);
  });
});

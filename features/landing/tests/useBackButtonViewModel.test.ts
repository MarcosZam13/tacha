// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LANDING_ROUTE } from "../constants/landing.constants";
import { useBackButtonViewModel } from "../hooks/useBackButtonViewModel";

// vi.mock se ejecuta antes que los imports: los mocks se crean con vi.hoisted
// para que ya existan cuando corre.
const { back, push } = vi.hoisted(() => ({ back: vi.fn(), push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ back, push }) }));

describe("useBackButtonViewModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("goes back when there is a previous page", () => {
    vi.spyOn(History.prototype, "length", "get").mockReturnValue(3);
    const { result } = renderHook(() => useBackButtonViewModel());

    result.current.goBack();

    expect(back).toHaveBeenCalled();
  });

  it("goes home when the page was opened directly", () => {
    vi.spyOn(History.prototype, "length", "get").mockReturnValue(1);
    const { result } = renderHook(() => useBackButtonViewModel());

    result.current.goBack();

    expect(push).toHaveBeenCalledWith(LANDING_ROUTE.HOME);
  });
});

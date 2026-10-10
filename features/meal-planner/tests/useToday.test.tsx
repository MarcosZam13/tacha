// @vitest-environment jsdom
import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useToday } from "../hooks/useToday";
import { toLocalDateKey } from "../utils/toLocalDateKey";

const TodayProbe = (): React.JSX.Element => <span>{String(useToday())}</span>;

describe("useToday", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the local day of the browser at midnight", () => {
    vi.setSystemTime(new Date(2026, 9, 14, 21, 30, 15));

    const { result } = renderHook(() => useToday());

    expect(result.current).toEqual(new Date(2026, 9, 14));
  });

  it("still says the same day late at night, whatever UTC says", () => {
    vi.setSystemTime(new Date(2026, 9, 14, 23, 59, 59));

    const { result } = renderHook(() => useToday());

    expect(result.current ? toLocalDateKey(result.current) : null).toBe("2026-10-14");
  });

  it("gives the same Date on every render while the day does not change", () => {
    vi.setSystemTime(new Date(2026, 9, 14, 9, 0));
    const { result, rerender } = renderHook(() => useToday());
    const firstRender = result.current;

    vi.setSystemTime(new Date(2026, 9, 14, 17, 0));
    rerender();

    expect(result.current).toBe(firstRender);
  });

  it("does not know today on the server, so the server never draws a date the browser would contradict", () => {
    vi.setSystemTime(new Date(2026, 9, 14, 9, 0));

    expect(renderToString(<TodayProbe />)).toContain("null");
  });
});

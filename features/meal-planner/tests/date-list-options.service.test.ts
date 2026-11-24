import { beforeEach, describe, expect, it, vi } from "vitest";
import { getDateListOptions } from "../services/date-list-options.service";

// Sin Supabase real: la consulta encadenada anota cada llamada y responde lo que el test decide.
const ensureSessionMock = vi.fn();
const fromMock = vi.fn();
const calls: unknown[][] = [];
let answer: { data: unknown; error: unknown };

vi.mock("@/services/supabase.client", () => ({
  ensureSession: () => ensureSessionMock(),
  getSupabaseClient: () => ({ from: fromMock }),
}));

const createQuery = () => {
  const query: Record<string, unknown> = {
    then: (onFulfilled: (value: unknown) => unknown) => Promise.resolve(answer).then(onFulfilled),
  };
  ["select", "eq", "gte", "order"].forEach((method) => {
    query[method] = (...args: unknown[]) => {
      calls.push([method, ...args]);
      return query;
    };
  });
  return query;
};

beforeEach(() => {
  vi.resetAllMocks();
  calls.length = 0;
  ensureSessionMock.mockResolvedValue(undefined);
  fromMock.mockImplementation(createQuery);
});

describe("getDateListOptions", () => {
  it("asks for the pending sublists from today on, the nearest first", async () => {
    answer = { data: [{ event_date: "2026-11-28", id: "a", name: "Paseo" }], error: null };

    const options = await getDateListOptions("2026-11-24");

    expect(fromMock).toHaveBeenCalledWith("lists");
    expect(calls).toEqual([
      ["select", "id, name, event_date"],
      ["eq", "type", "date"],
      ["eq", "status", "active"],
      ["gte", "event_date", "2026-11-24"],
      ["order", "event_date"],
      ["order", "created_at"],
    ]);
    expect(options).toEqual([{ id: "a", label: "Paseo · 28 nov", name: "Paseo" }]);
  });

  it("throws the database error", async () => {
    const databaseError = { message: "network" };
    answer = { data: null, error: databaseError };

    await expect(getDateListOptions("2026-11-24")).rejects.toBe(databaseError);
  });

  it("does not query when the session could not be opened", async () => {
    ensureSessionMock.mockRejectedValue(new Error("no session"));

    await expect(getDateListOptions("2026-11-24")).rejects.toThrow("no session");
    expect(fromMock).not.toHaveBeenCalled();
  });
});

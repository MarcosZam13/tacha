// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOUSEHOLD_LISTS_CHOICE,
  HOUSEHOLD_LISTS_DECISION_RESULT,
  HOUSEHOLD_LISTS_DECISION_STATE,
  HOUSEHOLD_LISTS_DECISION_TEXT,
} from "../constants/household.constants";
import type { HouseholdListsDecisionResultType } from "../constants/household.constants";
import { usePersonalListsDecision } from "../hooks/usePersonalListsDecision";
import { decidePersonalLists, getPersonalListsDecisionState } from "../services/household.service";

vi.mock("../services/household.service", () => ({
  decidePersonalLists: vi.fn(),
  getPersonalListsDecisionState: vi.fn(),
}));
const stateMock = vi.mocked(getPersonalListsDecisionState);
const decideMock = vi.mocked(decidePersonalLists);

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

// Miembro con pendientes y sin decidir: la pregunta se muestra.
const renderAsking = async () => {
  const rendered = renderHook(() => usePersonalListsDecision(true));
  await waitFor(() => expect(rendered.result.current.isVisible).toBe(true));
  return rendered;
};

beforeEach(() => {
  vi.resetAllMocks();
  stateMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_STATE.PENDING);
  decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.KEPT);
});

describe("usePersonalListsDecision: when to ask", () => {
  it("does not ask nor call the database without a household", () => {
    const { result } = renderHook(() => usePersonalListsDecision(false));

    expect(result.current.isVisible).toBe(false);
    expect(stateMock).not.toHaveBeenCalled();
  });

  it("asks a member with pending items who has not decided (CA-01, D1)", async () => {
    const { result } = await renderAsking();

    expect(result.current.isSaving).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it.each([
    HOUSEHOLD_LISTS_DECISION_STATE.DECIDED,
    HOUSEHOLD_LISTS_DECISION_STATE.NOTHING_TO_DECIDE,
    HOUSEHOLD_LISTS_DECISION_STATE.NOT_MEMBER,
  ])("does not ask when the database answers %s", async (state) => {
    stateMock.mockResolvedValue(state);
    const { result } = renderHook(() => usePersonalListsDecision(true));

    await waitFor(() => expect(stateMock).toHaveBeenCalledTimes(1));
    expect(result.current.isVisible).toBe(false);
  });

  it("does not block the screen when the check fails", async () => {
    stateMock.mockRejectedValue(new Error("network"));
    const { result } = renderHook(() => usePersonalListsDecision(true));

    await waitFor(() => expect(stateMock).toHaveBeenCalledTimes(1));
    expect(result.current.isVisible).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });
});

describe("usePersonalListsDecision: choosing", () => {
  it("keeps the list and shows the kept notice (CA-03)", async () => {
    const { result } = await renderAsking();

    await act(async () => result.current.onKeep());

    expect(decideMock).toHaveBeenCalledWith(HOUSEHOLD_LISTS_CHOICE.KEEP);
    expect(result.current.isVisible).toBe(false);
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_LISTS_DECISION_TEXT.KEPT);
  });

  it("shares the list and shows the shared notice (CA-04)", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.SHARED);
    const { result } = await renderAsking();

    await act(async () => result.current.onShare());

    expect(decideMock).toHaveBeenCalledWith(HOUSEHOLD_LISTS_CHOICE.SHARE);
    expect(result.current.isVisible).toBe(false);
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_LISTS_DECISION_TEXT.SHARED);
  });

  it("tells what stayed in the personal list when sharing was partial", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.SHARED_PARTIALLY);
    const { result } = await renderAsking();

    await act(async () => result.current.onShare());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_LISTS_DECISION_TEXT.SHARED_PARTIALLY);
  });

  it("says nothing was shared when the household had already bought everything", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.NOTHING_SHARED);
    const { result } = await renderAsking();

    await act(async () => result.current.onShare());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_LISTS_DECISION_TEXT.NOTHING_SHARED);
  });

  it("hides the question without a notice when it was already decided (CA-02)", async () => {
    decideMock.mockResolvedValue(HOUSEHOLD_LISTS_DECISION_RESULT.ALREADY_DECIDED);
    const { result } = await renderAsking();

    await act(async () => result.current.onShare());

    expect(result.current.isVisible).toBe(false);
    expect(result.current.noticeMessage).toBeNull();
  });

  it("keeps asking with the error when saving fails, and retries", async () => {
    decideMock.mockRejectedValueOnce(new Error("network"));
    const { result } = await renderAsking();

    await act(async () => result.current.onShare());

    expect(result.current.isVisible).toBe(true);
    expect(result.current.errorMessage).toBe(HOUSEHOLD_LISTS_DECISION_TEXT.SAVE_ERROR);

    await act(async () => result.current.onKeep());

    expect(decideMock).toHaveBeenCalledTimes(2);
    expect(result.current.isVisible).toBe(false);
  });

  it("sends a single request on a double click", async () => {
    const pendingDecision = createPending<HouseholdListsDecisionResultType>();
    decideMock.mockReturnValue(pendingDecision.promise);
    const { result } = await renderAsking();

    // Los dos clics en el mismo render: ven el mismo estado.
    act(() => {
      result.current.onShare();
      result.current.onShare();
    });

    expect(result.current.isSaving).toBe(true);
    await act(async () => pendingDecision.resolve(HOUSEHOLD_LISTS_DECISION_RESULT.SHARED));
    expect(decideMock).toHaveBeenCalledTimes(1);
  });

  it("ignores the answer if the screen closes while saving", async () => {
    const pendingDecision = createPending<HouseholdListsDecisionResultType>();
    decideMock.mockReturnValue(pendingDecision.promise);
    const { result, unmount } = await renderAsking();

    act(() => result.current.onKeep());
    unmount();
    await act(async () => pendingDecision.resolve(HOUSEHOLD_LISTS_DECISION_RESULT.KEPT));

    expect(result.current.noticeMessage).toBeNull();
  });
});

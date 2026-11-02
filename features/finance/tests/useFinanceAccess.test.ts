// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FINANCE_ACCESS_STATUS } from "../constants/finance.constants";
import { useFinanceAccess } from "../hooks/useFinanceAccess";
import { hasRegisteredSession } from "../services/finance.service";

vi.mock("../services/finance.service", () => ({
  hasRegisteredSession: vi.fn(),
}));
const sessionMock = vi.mocked(hasRegisteredSession);

const renderRegistered = async () => {
  const rendered = renderHook(() => useFinanceAccess());
  await waitFor(() => expect(rendered.result.current.isRegistered).toBe(true));
  return rendered;
};

beforeEach(() => {
  vi.resetAllMocks();
  sessionMock.mockResolvedValue(true);
});

// Sin globals, Testing Library no desmonta solo entre tests.
afterEach(cleanup);

describe("useFinanceAccess: first read", () => {
  it("starts checking the session", async () => {
    const { result } = renderHook(() => useFinanceAccess());

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.CHECKING);
    expect(result.current.isRegistered).toBe(false);
    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.REGISTERED));
  });

  it("is registered with a registered account", async () => {
    const { result } = await renderRegistered();

    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.REGISTERED);
  });

  it("is no account without a registered session (no session or anonymous)", async () => {
    sessionMock.mockResolvedValue(false);
    const { result } = renderHook(() => useFinanceAccess());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
    expect(result.current.isRegistered).toBe(false);
  });

  it("is no account when the session cannot be read", async () => {
    sessionMock.mockRejectedValue(new Error("storage"));
    const { result } = renderHook(() => useFinanceAccess());

    await waitFor(() => expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT));
  });
});

describe("useFinanceAccess: retry", () => {
  it("retries while the session is still registered", async () => {
    const { result } = await renderRegistered();
    const retry = vi.fn();

    await act(async () => result.current.retryIfRegistered(retry));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(result.current.isRegistered).toBe(true);
  });

  it("goes to no account instead of retrying when the session is no longer registered", async () => {
    const { result } = await renderRegistered();
    const retry = vi.fn();
    sessionMock.mockResolvedValue(false);

    await act(async () => result.current.retryIfRegistered(retry));

    expect(retry).not.toHaveBeenCalled();
    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT);
  });

  it("goes to no account when the session cannot be read again", async () => {
    const { result } = await renderRegistered();
    const retry = vi.fn();
    sessionMock.mockRejectedValue(new Error("storage"));

    await act(async () => result.current.retryIfRegistered(retry));

    expect(retry).not.toHaveBeenCalled();
    expect(result.current.accessStatus).toBe(FINANCE_ACCESS_STATUS.NO_ACCOUNT);
  });

  it("does not retry if the screen closed while reading the session", async () => {
    const { result, unmount } = await renderRegistered();
    const retry = vi.fn();
    const { retryIfRegistered } = result.current;

    unmount();
    await act(async () => retryIfRegistered(retry));

    expect(retry).not.toHaveBeenCalled();
  });
});

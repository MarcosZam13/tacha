// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_JOIN_RESULT, HOUSEHOLD_JOIN_TEXT } from "../constants/household.constants";
import type { HouseholdJoinResultType } from "../constants/household.constants";
import { useHouseholdInvitationViewModel } from "../hooks/useHouseholdInvitationViewModel";
import { acceptHouseholdInvite, hasRegisteredSession } from "../services/household.service";

// Sin Supabase real: el servicio se reemplaza por funciones de prueba.
vi.mock("../services/household.service", () => ({
  acceptHouseholdInvite: vi.fn(),
  hasRegisteredSession: vi.fn(),
}));

const hasRegisteredSessionMock = vi.mocked(hasRegisteredSession);
const acceptHouseholdInviteMock = vi.mocked(acceptHouseholdInvite);

const TOKEN = "3f2b8c1e-9a4d-4e7b-8c6f-1a2b3c4d5e6f";

// Renderiza el hook con una cuenta registrada y espera a que quede listo para unirse.
const renderReadyViewModel = async () => {
  hasRegisteredSessionMock.mockResolvedValue(true);
  const hook = renderHook(() => useHouseholdInvitationViewModel(TOKEN));
  await waitFor(() => expect(hook.result.current.showJoinButton).toBe(true));
  return hook;
};

// Pulsa "Unirme" con la respuesta indicada de la base.
const joinWithResult = async (joinResult: HouseholdJoinResultType) => {
  const hook = await renderReadyViewModel();
  acceptHouseholdInviteMock.mockResolvedValue(joinResult);
  act(() => hook.result.current.onJoin());
  await waitFor(() => expect(hook.result.current.isJoining).toBe(false));
  return hook;
};

describe("useHouseholdInvitationViewModel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Sin globals de Vitest, Testing Library no desmonta solo entre tests.
  afterEach(() => {
    cleanup();
  });

  it("marks a malformed token as invalid without checking the session", () => {
    const { result } = renderHook(() => useHouseholdInvitationViewModel("no-es-un-token"));

    expect(result.current.errorMessage).toBe(HOUSEHOLD_JOIN_TEXT.INVALID);
    expect(result.current.showJoinButton).toBe(false);
    expect(hasRegisteredSessionMock).not.toHaveBeenCalled();
  });

  it("asks to log in when there is no registered session", async () => {
    hasRegisteredSessionMock.mockResolvedValue(false);

    const { result } = renderHook(() => useHouseholdInvitationViewModel(TOKEN));

    await waitFor(() => expect(result.current.showLoginLink).toBe(true));
    expect(result.current.description).toBe(HOUSEHOLD_JOIN_TEXT.NO_ACCOUNT);
    expect(result.current.showJoinButton).toBe(false);
  });

  it("is ready to join with a registered session and does not join on its own", async () => {
    const { result } = await renderReadyViewModel();

    expect(result.current.joinLabel).toBe(HOUSEHOLD_JOIN_TEXT.JOIN);
    expect(acceptHouseholdInviteMock).not.toHaveBeenCalled();
  });

  it("shows the reload error when the session cannot be read", async () => {
    hasRegisteredSessionMock.mockRejectedValue(new Error("network"));

    const { result } = renderHook(() => useHouseholdInvitationViewModel(TOKEN));

    await waitFor(() => expect(result.current.errorMessage).toBe(HOUSEHOLD_JOIN_TEXT.LOAD_ERROR));
  });

  it("confirms and offers the household link after joining", async () => {
    const { result } = await joinWithResult(HOUSEHOLD_JOIN_RESULT.JOINED);

    expect(acceptHouseholdInviteMock).toHaveBeenCalledWith(TOKEN);
    expect(result.current.statusMessage).toBe(HOUSEHOLD_JOIN_TEXT.JOINED);
    expect(result.current.showHouseholdLink).toBe(true);
    expect(result.current.showJoinButton).toBe(false);
  });

  it("explains an expired invitation and offers no action", async () => {
    const { result } = await joinWithResult(HOUSEHOLD_JOIN_RESULT.EXPIRED);

    expect(result.current.errorMessage).toBe(HOUSEHOLD_JOIN_TEXT.EXPIRED);
    expect(result.current.showJoinButton).toBe(false);
    expect(result.current.showHouseholdLink).toBe(false);
  });

  it("explains an invalid invitation answered by the database", async () => {
    const { result } = await joinWithResult(HOUSEHOLD_JOIN_RESULT.INVALID);

    expect(result.current.errorMessage).toBe(HOUSEHOLD_JOIN_TEXT.INVALID);
    expect(result.current.showJoinButton).toBe(false);
  });

  it("tells an existing member and offers the household link", async () => {
    const { result } = await joinWithResult(HOUSEHOLD_JOIN_RESULT.ALREADY_MEMBER);

    expect(result.current.statusMessage).toBe(HOUSEHOLD_JOIN_TEXT.ALREADY_MEMBER);
    expect(result.current.showHouseholdLink).toBe(true);
  });

  it("blocks joining when the user is in another household", async () => {
    const { result } = await joinWithResult(HOUSEHOLD_JOIN_RESULT.IN_OTHER_HOUSEHOLD);

    expect(result.current.errorMessage).toBe(HOUSEHOLD_JOIN_TEXT.IN_OTHER_HOUSEHOLD);
    expect(result.current.showJoinButton).toBe(false);
    expect(result.current.showHouseholdLink).toBe(true);
  });

  it("shows the error and lets the user retry when joining fails", async () => {
    const hook = await renderReadyViewModel();
    acceptHouseholdInviteMock.mockRejectedValue(new Error("network"));

    act(() => hook.result.current.onJoin());

    await waitFor(() => expect(hook.result.current.errorMessage).toBe(HOUSEHOLD_JOIN_TEXT.FAILED));
    expect(hook.result.current.showJoinButton).toBe(true);
    expect(hook.result.current.isJoining).toBe(false);
  });

  it("sends a single request when Unirme is pressed twice in a row", async () => {
    const hook = await renderReadyViewModel();
    // Una respuesta que todavía no llega: la unión queda en curso.
    let resolveJoin: (joinResult: HouseholdJoinResultType) => void = () => undefined;
    acceptHouseholdInviteMock.mockReturnValue(
      new Promise((resolve) => {
        resolveJoin = resolve;
      }),
    );

    act(() => {
      hook.result.current.onJoin();
      hook.result.current.onJoin();
    });

    expect(acceptHouseholdInviteMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.isJoining).toBe(true);
    expect(hook.result.current.joinLabel).toBe(HOUSEHOLD_JOIN_TEXT.JOINING);

    await act(async () => resolveJoin(HOUSEHOLD_JOIN_RESULT.JOINED));
    expect(hook.result.current.statusMessage).toBe(HOUSEHOLD_JOIN_TEXT.JOINED);
  });
});

// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOUSEHOLD_LEAVE_TEXT,
  HOUSEHOLD_REMOVE_MEMBER_RESULT,
  HOUSEHOLD_REMOVE_MEMBER_TEXT,
  HOUSEHOLD_ROLE,
} from "../constants/household.constants";
import type { HouseholdRemoveMemberResultType } from "../constants/household.constants";
import { useHouseholdMemberRemoval } from "../hooks/useHouseholdMemberRemoval";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import { removeHouseholdMember } from "../services/household.service";

vi.mock("../services/household.service", () => ({
  removeHouseholdMember: vi.fn(),
}));
const removeMock = vi.mocked(removeHouseholdMember);

// Ids y nombres inventados (no son de la base).
const BETO: HouseholdMember = {
  displayName: "Beto",
  isCurrentUser: false,
  role: HOUSEHOLD_ROLE.MEMBER,
  userId: "user-beto",
};
const UNNAMED: HouseholdMember = { ...BETO, displayName: null, userId: "user-unnamed" };

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderRemoval = () => {
  const callbacks = { onAdminLost: vi.fn(), onMembersChanged: vi.fn() };
  const rendered = renderHook(() => useHouseholdMemberRemoval(callbacks));
  return { ...rendered, callbacks };
};

// Con el diálogo abierto para Beto.
const renderConfirming = () => {
  const rendered = renderRemoval();
  act(() => rendered.result.current.onRemoveRequest(BETO));
  return rendered;
};

// Sin globals, Testing Library no desmonta solo entre tests.
afterEach(cleanup);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useHouseholdMemberRemoval: confirmation (CA-02)", () => {
  it("starts closed", () => {
    const { result } = renderRemoval();

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.memberLabel).toBeNull();
    expect(result.current.errorMessage).toBeNull();
  });

  it("opens the confirmation for a member without calling the database", () => {
    const { result } = renderConfirming();

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.memberLabel).toBe("Beto");
    expect(removeMock).not.toHaveBeenCalled();
  });

  it("names a member without a name as «Miembro sin nombre»", () => {
    const { result } = renderRemoval();

    act(() => result.current.onRemoveRequest(UNNAMED));

    expect(result.current.memberLabel).toBe(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER);
  });

  it("names a member whose name is only spaces as «Miembro sin nombre», like the row", () => {
    const { result } = renderRemoval();

    act(() => result.current.onRemoveRequest({ ...BETO, displayName: "   " }));

    expect(result.current.memberLabel).toBe(HOUSEHOLD_LEAVE_TEXT.UNNAMED_MEMBER);
  });

  it("cancels without calling the database", () => {
    const { result } = renderConfirming();

    act(() => result.current.onRemoveCancel());

    expect(result.current.isDialogOpen).toBe(false);
    expect(removeMock).not.toHaveBeenCalled();
  });
});

describe("useHouseholdMemberRemoval: results", () => {
  it("removes the member, shows the success notice and reloads the list (CA-03, CA-04)", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED);
    const { callbacks, result } = renderConfirming();

    await act(async () => result.current.onRemoveConfirm());

    expect(removeMock).toHaveBeenCalledWith("user-beto");
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS);
    expect(callbacks.onMembersChanged).toHaveBeenCalledTimes(1);
    expect(callbacks.onAdminLost).not.toHaveBeenCalled();
  });

  it("closes and reloads the list without a message when the member was already gone", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.MEMBER_NOT_FOUND);
    const { callbacks, result } = renderConfirming();

    await act(async () => result.current.onRemoveConfirm());

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.noticeMessage).toBeNull();
    expect(result.current.errorMessage).toBeNull();
    expect(callbacks.onMembersChanged).toHaveBeenCalledTimes(1);
  });

  it("closes and asks to read the membership again when the caller is no longer the admin", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.NOT_ADMIN);
    const { callbacks, result } = renderConfirming();

    await act(async () => result.current.onRemoveConfirm());

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.noticeMessage).toBeNull();
    expect(callbacks.onAdminLost).toHaveBeenCalledTimes(1);
    expect(callbacks.onMembersChanged).not.toHaveBeenCalled();
  });

  it("shows the error when the database answers cannot_remove_self", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.CANNOT_REMOVE_SELF);
    const { callbacks, result } = renderConfirming();

    await act(async () => result.current.onRemoveConfirm());

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.errorMessage).toBe(HOUSEHOLD_REMOVE_MEMBER_TEXT.ERROR);
    expect(callbacks.onMembersChanged).not.toHaveBeenCalled();
    expect(callbacks.onAdminLost).not.toHaveBeenCalled();
  });
});

describe("useHouseholdMemberRemoval: errors and double click", () => {
  it("keeps the dialog open with the error and retries with the same member", async () => {
    removeMock
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED);
    const { result } = renderConfirming();

    await act(async () => result.current.onRemoveConfirm());

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.memberLabel).toBe("Beto");
    expect(result.current.errorMessage).toBe(HOUSEHOLD_REMOVE_MEMBER_TEXT.ERROR);

    await act(async () => result.current.onRemoveConfirm());

    expect(removeMock).toHaveBeenNthCalledWith(2, "user-beto");
    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS);
  });

  it("sends a single request on a double click and cannot be closed while removing", async () => {
    const pendingRemoval = createPending<HouseholdRemoveMemberResultType>();
    removeMock.mockReturnValue(pendingRemoval.promise);
    const { result } = renderConfirming();

    // Los dos clics en el mismo render: ven el mismo estado.
    act(() => {
      result.current.onRemoveConfirm();
      result.current.onRemoveConfirm();
    });
    expect(result.current.isRemoving).toBe(true);
    act(() => result.current.onRemoveCancel());
    expect(result.current.isDialogOpen).toBe(true);

    await act(async () => pendingRemoval.resolve(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED));

    expect(removeMock).toHaveBeenCalledTimes(1);
    expect(result.current.isRemoving).toBe(false);
  });

  it("clears the previous success notice when another removal starts", async () => {
    removeMock.mockResolvedValue(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED);
    const { result } = renderConfirming();
    await act(async () => result.current.onRemoveConfirm());
    expect(result.current.noticeMessage).toBe(HOUSEHOLD_REMOVE_MEMBER_TEXT.SUCCESS);

    act(() => result.current.onRemoveRequest(UNNAMED));

    expect(result.current.noticeMessage).toBeNull();
  });

  it("ignores the answer if the screen closes while removing", async () => {
    const pendingRemoval = createPending<HouseholdRemoveMemberResultType>();
    removeMock.mockReturnValue(pendingRemoval.promise);
    const { callbacks, result, unmount } = renderConfirming();
    act(() => result.current.onRemoveConfirm());

    unmount();
    await act(async () => pendingRemoval.resolve(HOUSEHOLD_REMOVE_MEMBER_RESULT.REMOVED));

    expect(callbacks.onMembersChanged).not.toHaveBeenCalled();
  });
});

// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOUSEHOLD_LEAVE_DIALOG_CASE,
  HOUSEHOLD_LEAVE_RESULT,
  HOUSEHOLD_LEAVE_TEXT,
  HOUSEHOLD_ROLE,
} from "../constants/household.constants";
import type { HouseholdLeaveResultType } from "../constants/household.constants";
import { useHouseholdLeave } from "../hooks/useHouseholdLeave";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import { getHouseholdMembers, leaveHousehold } from "../services/household.service";

vi.mock("../services/household.service", () => ({
  getHouseholdMembers: vi.fn(),
  leaveHousehold: vi.fn(),
}));
const getMembersMock = vi.mocked(getHouseholdMembers);
const leaveMock = vi.mocked(leaveHousehold);
const onLeftMock = vi.fn();

// Ids y nombres inventados (no son de la base).
const ADMIN: HouseholdMember = {
  displayName: "Ana",
  isCurrentUser: true,
  role: HOUSEHOLD_ROLE.ADMIN,
  userId: "user-ana",
};
const BETO: HouseholdMember = {
  displayName: "Beto",
  isCurrentUser: false,
  role: HOUSEHOLD_ROLE.MEMBER,
  userId: "user-beto",
};
const UNNAMED: HouseholdMember = {
  displayName: null,
  isCurrentUser: false,
  role: HOUSEHOLD_ROLE.MEMBER,
  userId: "user-unnamed",
};

/** Una respuesta de la base que el test decide cuándo llega. */
const createPending = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  const promise = new Promise<Value>((onResolve) => {
    resolve = onResolve;
  });
  return { promise, resolve };
};

const renderLeave = (isAdmin: boolean) => renderHook(() => useHouseholdLeave({ isAdmin, onLeft: onLeftMock }));

beforeEach(() => {
  vi.resetAllMocks();
  getMembersMock.mockResolvedValue([ADMIN, BETO, UNNAMED]);
  leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.LEFT);
});

describe("useHouseholdLeave: opening the confirmation", () => {
  it("starts closed and calls nothing", () => {
    const { result } = renderLeave(true);

    expect(result.current.isDialogOpen).toBe(false);
    expect(getMembersMock).not.toHaveBeenCalled();
    expect(leaveMock).not.toHaveBeenCalled();
  });

  it("opens the member confirmation without loading the members", () => {
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());

    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.dialogCase).toBe(HOUSEHOLD_LEAVE_DIALOG_CASE.MEMBER);
    expect(result.current.showConfirm).toBe(true);
    expect(result.current.isConfirmDisabled).toBe(false);
    expect(getMembersMock).not.toHaveBeenCalled();
    expect(leaveMock).not.toHaveBeenCalled();
  });

  it("loads the members for the admin and leaves the admin out of the choices", async () => {
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());

    expect(result.current.isLoadingMembers).toBe(true);
    expect(result.current.showConfirm).toBe(false);
    await waitFor(() => expect(result.current.dialogCase).toBe(HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER));
    expect(result.current.newAdminCandidates).toEqual([BETO, UNNAMED]);
    // Sin elegir a nadie no se puede confirmar.
    expect(result.current.isConfirmDisabled).toBe(true);
  });

  it("warns the sole admin that the family is deleted, with nobody to choose", async () => {
    getMembersMock.mockResolvedValue([ADMIN]);
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());

    await waitFor(() => expect(result.current.dialogCase).toBe(HOUSEHOLD_LEAVE_DIALOG_CASE.SOLE_ADMIN));
    expect(result.current.newAdminCandidates).toEqual([]);
    expect(result.current.isConfirmDisabled).toBe(false);
  });

  it("shows the load error and no confirm button when the members cannot be loaded", async () => {
    getMembersMock.mockRejectedValue(new Error("network"));
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());

    await waitFor(() => expect(result.current.errorMessage).toBe(HOUSEHOLD_LEAVE_TEXT.MEMBERS_LOAD_ERROR));
    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.showConfirm).toBe(false);
  });

  it("ignores a members answer that arrives after cancelling", async () => {
    const pendingMembers = createPending<HouseholdMember[]>();
    getMembersMock.mockReturnValue(pendingMembers.promise);
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    act(() => result.current.onLeaveCancel());
    await act(async () => pendingMembers.resolve([ADMIN, BETO]));

    expect(result.current.isDialogOpen).toBe(false);
  });

  it("stays closed when the members load fails after cancelling", async () => {
    let rejectMembers: (error: Error) => void = () => undefined;
    getMembersMock.mockReturnValue(
      new Promise<HouseholdMember[]>((_, onReject) => {
        rejectMembers = onReject;
      }),
    );
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    act(() => result.current.onLeaveCancel());
    // Solo isCancelled lo frena: el catch no revisa el estado.
    await act(async () => rejectMembers(new Error("network")));

    expect(result.current.isDialogOpen).toBe(false);
    expect(result.current.errorMessage).toBeNull();
  });

  it("ignores the answer of a load cancelled before reopening the dialog", async () => {
    const firstLoad = createPending<HouseholdMember[]>();
    const secondLoad = createPending<HouseholdMember[]>();
    getMembersMock.mockReturnValueOnce(firstLoad.promise).mockReturnValueOnce(secondLoad.promise);
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    act(() => result.current.onLeaveCancel());
    act(() => result.current.onLeaveRequest());
    // La respuesta vieja llega mientras la nueva carga: el estado es otra vez
    // "cargando", así que solo isCancelled la descarta.
    await act(async () => firstLoad.resolve([ADMIN, BETO]));
    expect(result.current.isLoadingMembers).toBe(true);

    await act(async () => secondLoad.resolve([ADMIN, UNNAMED]));
    expect(result.current.newAdminCandidates).toEqual([UNNAMED]);
  });
});

describe("useHouseholdLeave: leaving", () => {
  it("lets a member leave without sending a new admin", async () => {
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    await act(async () => result.current.onLeaveConfirm());

    expect(leaveMock).toHaveBeenCalledTimes(1);
    expect(leaveMock).toHaveBeenCalledWith(undefined);
    expect(onLeftMock).toHaveBeenCalledWith(HOUSEHOLD_LEAVE_RESULT.LEFT);
    expect(result.current.isDialogOpen).toBe(false);
  });

  it("deletes the family when the sole admin leaves", async () => {
    getMembersMock.mockResolvedValue([ADMIN]);
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.HOUSEHOLD_DELETED);
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    await waitFor(() => expect(result.current.showConfirm).toBe(true));
    await act(async () => result.current.onLeaveConfirm());

    expect(leaveMock).toHaveBeenCalledWith(undefined);
    expect(onLeftMock).toHaveBeenCalledWith(HOUSEHOLD_LEAVE_RESULT.HOUSEHOLD_DELETED);
    expect(result.current.isDialogOpen).toBe(false);
  });

  it("does not leave until the admin chooses the new admin, then sends that member", async () => {
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    await waitFor(() => expect(result.current.showConfirm).toBe(true));
    act(() => result.current.onLeaveConfirm());
    expect(leaveMock).not.toHaveBeenCalled();

    act(() => result.current.onNewAdminSelect(BETO.userId));
    expect(result.current.selectedNewAdminId).toBe(BETO.userId);
    expect(result.current.isConfirmDisabled).toBe(false);
    await act(async () => result.current.onLeaveConfirm());

    expect(leaveMock).toHaveBeenCalledWith(BETO.userId);
    expect(onLeftMock).toHaveBeenCalledWith(HOUSEHOLD_LEAVE_RESULT.LEFT);
  });

  it("ignores a choice that is not in the members list", async () => {
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    await waitFor(() => expect(result.current.showConfirm).toBe(true));
    act(() => result.current.onNewAdminSelect(ADMIN.userId));

    expect(result.current.selectedNewAdminId).toBeNull();
  });

  it("closes and reports not_member without a notice of its own", async () => {
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.NOT_MEMBER);
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    await act(async () => result.current.onLeaveConfirm());

    expect(onLeftMock).toHaveBeenCalledWith(HOUSEHOLD_LEAVE_RESULT.NOT_MEMBER);
    expect(result.current.isDialogOpen).toBe(false);
  });

  it("reloads the members and asks to choose again on invalid_new_admin", async () => {
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.INVALID_NEW_ADMIN);
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    await waitFor(() => expect(result.current.showConfirm).toBe(true));
    getMembersMock.mockResolvedValue([ADMIN, UNNAMED]);
    act(() => result.current.onNewAdminSelect(BETO.userId));
    await act(async () => result.current.onLeaveConfirm());

    await waitFor(() => expect(result.current.newAdminCandidates).toEqual([UNNAMED]));
    expect(getMembersMock).toHaveBeenCalledTimes(2);
    expect(result.current.errorMessage).toBe(HOUSEHOLD_LEAVE_TEXT.INVALID_NEW_ADMIN);
    expect(result.current.selectedNewAdminId).toBeNull();
    expect(result.current.isDialogOpen).toBe(true);
    expect(onLeftMock).not.toHaveBeenCalled();
  });

  it("drops the choose-again notice when nobody is left to choose", async () => {
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.INVALID_NEW_ADMIN);
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    await waitFor(() => expect(result.current.showConfirm).toBe(true));
    // Mientras confirmaba, los demás salieron: al recargar está sola.
    getMembersMock.mockResolvedValue([ADMIN]);
    act(() => result.current.onNewAdminSelect(BETO.userId));
    await act(async () => result.current.onLeaveConfirm());

    await waitFor(() => expect(result.current.dialogCase).toBe(HOUSEHOLD_LEAVE_DIALOG_CASE.SOLE_ADMIN));
    expect(result.current.errorMessage).toBeNull();
  });

  it("loads the members on transfer_required, even if the screen showed a member", async () => {
    // Le pasaron el rol con el diálogo abierto y hay otros miembros.
    leaveMock.mockResolvedValue(HOUSEHOLD_LEAVE_RESULT.TRANSFER_REQUIRED);
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    await act(async () => result.current.onLeaveConfirm());

    await waitFor(() => expect(result.current.dialogCase).toBe(HOUSEHOLD_LEAVE_DIALOG_CASE.TRANSFER));
    expect(result.current.errorMessage).toBe(HOUSEHOLD_LEAVE_TEXT.TRANSFER_REQUIRED);
    expect(result.current.newAdminCandidates).toEqual([BETO, UNNAMED]);
    expect(onLeftMock).not.toHaveBeenCalled();
  });

  it("keeps the dialog open with the error and retries with the same choice", async () => {
    leaveMock.mockRejectedValueOnce(new Error("network"));
    const { result } = renderLeave(true);

    act(() => result.current.onLeaveRequest());
    await waitFor(() => expect(result.current.showConfirm).toBe(true));
    act(() => result.current.onNewAdminSelect(BETO.userId));
    await act(async () => result.current.onLeaveConfirm());

    expect(result.current.errorMessage).toBe(HOUSEHOLD_LEAVE_TEXT.FAILED);
    expect(result.current.isDialogOpen).toBe(true);
    expect(result.current.selectedNewAdminId).toBe(BETO.userId);

    await act(async () => result.current.onLeaveConfirm());

    expect(leaveMock).toHaveBeenCalledTimes(2);
    expect(leaveMock).toHaveBeenLastCalledWith(BETO.userId);
    expect(onLeftMock).toHaveBeenCalledWith(HOUSEHOLD_LEAVE_RESULT.LEFT);
  });

  it("sends a single request on a double click", async () => {
    const pendingLeave = createPending<HouseholdLeaveResultType>();
    leaveMock.mockReturnValue(pendingLeave.promise);
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    // Los dos clics en el mismo render: ven el mismo estado.
    act(() => {
      result.current.onLeaveConfirm();
      result.current.onLeaveConfirm();
    });

    expect(result.current.isLeaving).toBe(true);
    expect(result.current.isConfirmDisabled).toBe(true);
    await act(async () => pendingLeave.resolve(HOUSEHOLD_LEAVE_RESULT.LEFT));
    expect(leaveMock).toHaveBeenCalledTimes(1);
  });
});

describe("useHouseholdLeave: cancelling", () => {
  it("closes without calling the database", () => {
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    act(() => result.current.onLeaveCancel());

    expect(result.current.isDialogOpen).toBe(false);
    expect(leaveMock).not.toHaveBeenCalled();
    expect(onLeftMock).not.toHaveBeenCalled();
  });

  it("does not close while leaving", async () => {
    const pendingLeave = createPending<HouseholdLeaveResultType>();
    leaveMock.mockReturnValue(pendingLeave.promise);
    const { result } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    act(() => result.current.onLeaveConfirm());
    act(() => result.current.onLeaveCancel());

    expect(result.current.isDialogOpen).toBe(true);
    await act(async () => pendingLeave.resolve(HOUSEHOLD_LEAVE_RESULT.LEFT));
    expect(onLeftMock).toHaveBeenCalledWith(HOUSEHOLD_LEAVE_RESULT.LEFT);
  });

  it("ignores the answer if the screen closes while leaving", async () => {
    const pendingLeave = createPending<HouseholdLeaveResultType>();
    leaveMock.mockReturnValue(pendingLeave.promise);
    const { result, unmount } = renderLeave(false);

    act(() => result.current.onLeaveRequest());
    act(() => result.current.onLeaveConfirm());
    unmount();
    await act(async () => pendingLeave.resolve(HOUSEHOLD_LEAVE_RESULT.LEFT));

    expect(onLeftMock).not.toHaveBeenCalled();
  });
});

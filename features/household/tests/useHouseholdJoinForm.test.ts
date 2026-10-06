// @vitest-environment jsdom
import type { FormEvent } from "react";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_JOIN_FORM_ERROR, HOUSEHOLD_ROUTE } from "../constants/household.constants";
import { useHouseholdJoinForm } from "../hooks/useHouseholdJoinForm";

const pushMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const TOKEN = "3f2b8c1e-9a4d-4e7b-8c6f-1a2b3c4d5e6f";

// El hook solo usa preventDefault del evento del formulario.
const createSubmitEvent = (): FormEvent<HTMLFormElement> =>
  ({ preventDefault: vi.fn() }) as unknown as FormEvent<HTMLFormElement>;

// Escribe el texto y envía el formulario; devuelve el hook para revisar su estado.
const submitWithText = (inviteText: string) => {
  const hook = renderHook(() => useHouseholdJoinForm());
  act(() => hook.result.current.onInviteTextChange(inviteText));
  act(() => hook.result.current.onJoinSubmit(createSubmitEvent()));
  return hook;
};

describe("useHouseholdJoinForm", () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  // Sin globals de Vitest, Testing Library no desmonta solo entre tests.
  afterEach(() => {
    cleanup();
  });

  it("shows the required error and does not navigate when the field is empty", () => {
    const { result } = submitWithText("   ");

    expect(result.current.inviteError).toBe(HOUSEHOLD_JOIN_FORM_ERROR.REQUIRED);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("shows the invalid error and does not navigate when there is no token", () => {
    const { result } = submitWithText("esto no es un enlace");

    expect(result.current.inviteError).toBe(HOUSEHOLD_JOIN_FORM_ERROR.INVALID);
    expect(pushMock).not.toHaveBeenCalled();
  });

  it("navigates to the invitation page when the code is pasted", () => {
    submitWithText(TOKEN);

    expect(pushMock).toHaveBeenCalledWith(`${HOUSEHOLD_ROUTE.INVITATION}/${TOKEN}`);
  });

  it("navigates to the invitation page when the full link is pasted", () => {
    submitWithText(`https://tacha.app/invitacion/${TOKEN}`);

    expect(pushMock).toHaveBeenCalledWith(`${HOUSEHOLD_ROUTE.INVITATION}/${TOKEN}`);
  });

  it("clears the error when the user types again", () => {
    const { result } = submitWithText("");

    act(() => result.current.onInviteTextChange(TOKEN));

    expect(result.current.inviteError).toBeUndefined();
  });
});

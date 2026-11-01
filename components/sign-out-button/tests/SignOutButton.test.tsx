// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_ROUTE, UNSAVED_CHANGES_SOURCE } from "@/constants";
import { signOutUser } from "@/services/session.service";
import { setUnsavedChanges } from "@/services/unsaved-changes.service";
import { SignOutButton } from "../SignOutButton";
import { createSignOutButtonPage } from "./SignOutButton.page";

const replaceMock = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock("@/services/session.service", () => ({ signOutUser: vi.fn() }));
const signOutUserMock = vi.mocked(signOutUser);

// Sin globals de Vitest, Testing Library no limpia el DOM sola entre tests.
afterEach(() => {
  cleanup();
  setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false);
});

beforeEach(() => {
  vi.resetAllMocks();
  signOutUserMock.mockResolvedValue(undefined);
});

const renderButton = (): ReturnType<typeof createSignOutButtonPage> => {
  render(<SignOutButton />);
  return createSignOutButtonPage();
};

describe("SignOutButton", () => {
  // CA-01
  it("offers the sign-out action as a button", () => {
    const page = renderButton();

    expect(page.getTrigger()).toBeEnabled();
    expect(page.queryDialog()).not.toBeInTheDocument();
  });

  // CA-02, CA-03
  it("signs out immediately and goes to the login when nothing is unsaved", async () => {
    const page = renderButton();

    await page.clickTrigger();

    expect(signOutUserMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(AUTH_ROUTE.LOGIN);
    expect(page.queryDialog()).not.toBeInTheDocument();
  });

  // CA-03
  it("asks before signing out when something is unsaved, and does not sign out yet", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const page = renderButton();

    await page.clickTrigger();

    expect(page.queryDialog()).toBeInTheDocument();
    expect(signOutUserMock).not.toHaveBeenCalled();
  });

  it("keeps the screen as it was when the person chooses to keep editing", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const page = renderButton();
    await page.clickTrigger();

    await page.cancel();

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(signOutUserMock).not.toHaveBeenCalled();
  });

  it("closes the confirmation with Escape without signing out", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const page = renderButton();
    await page.clickTrigger();

    await page.pressEscape();

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(signOutUserMock).not.toHaveBeenCalled();
  });

  it("signs out and goes to the login once the confirmation is accepted", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const page = renderButton();
    await page.clickTrigger();

    await page.confirm();

    expect(signOutUserMock).toHaveBeenCalledTimes(1);
    expect(replaceMock).toHaveBeenCalledWith(AUTH_ROUTE.LOGIN);
  });

  it("signs out without asking again after the unsaved changes are saved", async () => {
    setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, true);
    const page = renderButton();
    act(() => setUnsavedChanges(UNSAVED_CHANGES_SOURCE.PROFILE, false));

    await page.clickTrigger();

    expect(page.queryDialog()).not.toBeInTheDocument();
    expect(signOutUserMock).toHaveBeenCalledTimes(1);
  });

  it("disables the button while it signs out", async () => {
    let finishSignOut: () => void = () => undefined;
    signOutUserMock.mockReturnValue(new Promise<void>((resolve) => (finishSignOut = resolve)));
    const page = renderButton();

    await page.clickTrigger();

    expect(page.queryBusyTrigger()).toBeDisabled();
    await act(async () => finishSignOut());
  });
});

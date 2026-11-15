// @vitest-environment jsdom
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APP_ROUTE, AUTH_ROUTE } from "@/constants";
import { SOCIAL_SIGN_UP_STATUS } from "../constants/social-sign-up.constants";
import { useSocialSignUpCallbackViewModel } from "../hooks/useSocialSignUpCallbackViewModel";
import { completeSocialSignUp } from "../services/social-sign-up.service";

const { router } = vi.hoisted(() => ({ router: { replace: vi.fn() } }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("../services/social-sign-up.service", () => ({ completeSocialSignUp: vi.fn() }));
const completeSocialSignUpMock = vi.mocked(completeSocialSignUp);

afterEach(cleanup);
beforeEach(() => {
  vi.clearAllMocks();
});

describe("useSocialSignUpCallbackViewModel", () => {
  // CA-05
  it("sends a new account into the app", async () => {
    completeSocialSignUpMock.mockResolvedValue(SOCIAL_SIGN_UP_STATUS.SUCCESS);

    renderHook(() => useSocialSignUpCallbackViewModel());

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith(APP_ROUTE.LIST));
  });

  // CA-04
  it("suggests signing in when the email already exists", async () => {
    completeSocialSignUpMock.mockResolvedValue(SOCIAL_SIGN_UP_STATUS.EMAIL_EXISTS);

    const { result } = renderHook(() => useSocialSignUpCallbackViewModel());

    await waitFor(() => expect(result.current.feedback?.linkHref).toBe(AUTH_ROUTE.LOGIN));
    expect(router.replace).not.toHaveBeenCalled();
  });

  // CA-06
  it("shows the error feedback when the service fails", async () => {
    completeSocialSignUpMock.mockRejectedValue(new Error("failed"));

    const { result } = renderHook(() => useSocialSignUpCallbackViewModel());

    await waitFor(() => expect(result.current.feedback?.linkHref).toBe(AUTH_ROUTE.REGISTER));
  });
});

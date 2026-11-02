import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateUserPassword } from "@/services/password.service";
import { PASSWORD_UPDATE_RESULT } from "@/constants";
import { CHANGE_PASSWORD_RESULT } from "../constants/change-password.constants";
import { changePassword } from "../services/change-password.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con los métodos que se usan.
const getUserMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const getSupabaseClientMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => getSupabaseClientMock(),
}));
vi.mock("@/services/password.service", () => ({ updateUserPassword: vi.fn() }));
const updateUserPasswordMock = vi.mocked(updateUserPassword);

const PARAMS = { currentPassword: "Actual123!", newPassword: "Tacha2026!" };

beforeEach(() => {
  vi.resetAllMocks();
  getSupabaseClientMock.mockReturnValue({
    auth: { getUser: getUserMock, signInWithPassword: signInWithPasswordMock },
  });
  getUserMock.mockResolvedValue({ data: { user: { email: "ana@correo.com" } }, error: null });
  signInWithPasswordMock.mockResolvedValue({ data: {}, error: null });
  updateUserPasswordMock.mockResolvedValue(PASSWORD_UPDATE_RESULT.SUCCESS);
});

describe("changePassword", () => {
  it("verifies the current password against the account's email before changing anything", async () => {
    await changePassword(PARAMS);

    expect(signInWithPasswordMock).toHaveBeenCalledWith({
      email: "ana@correo.com",
      password: PARAMS.currentPassword,
    });
    expect(signInWithPasswordMock.mock.invocationCallOrder[0]).toBeLessThan(
      updateUserPasswordMock.mock.invocationCallOrder[0],
    );
  });

  it("changes the password and reports success when the current one is correct", async () => {
    const result = await changePassword(PARAMS);

    expect(updateUserPasswordMock).toHaveBeenCalledWith(PARAMS.newPassword);
    expect(result).toBe(CHANGE_PASSWORD_RESULT.SUCCESS);
  });

  it("does not change anything when the current password is wrong", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: null,
      error: { code: "invalid_credentials", status: 400 },
    });

    const result = await changePassword(PARAMS);

    expect(result).toBe(CHANGE_PASSWORD_RESULT.WRONG_CURRENT_PASSWORD);
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });

  it.each([
    ["by status 429", { code: "unexpected_failure", status: 429 }],
    ["by its error code", { code: "over_request_rate_limit", status: 400 }],
  ])("reports too many attempts when Supabase rate limits the check (%s)", async (_label, error) => {
    signInWithPasswordMock.mockResolvedValue({ data: null, error });

    expect(await changePassword(PARAMS)).toBe(CHANGE_PASSWORD_RESULT.TOO_MANY_ATTEMPTS);
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });

  it("reports a generic error for any other failure of the check, and changes nothing", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: null,
      error: { code: "unexpected_failure", status: 500 },
    });

    expect(await changePassword(PARAMS)).toBe(CHANGE_PASSWORD_RESULT.ERROR);
    expect(updateUserPasswordMock).not.toHaveBeenCalled();
  });

  it("passes on the result of the update, such as a new password equal to the current one", async () => {
    updateUserPasswordMock.mockResolvedValue(PASSWORD_UPDATE_RESULT.SAME_PASSWORD);

    expect(await changePassword(PARAMS)).toBe(CHANGE_PASSWORD_RESULT.SAME_PASSWORD);
  });

  it("reports an error for an account without email, such as an anonymous one", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: undefined } }, error: null });

    expect(await changePassword(PARAMS)).toBe(CHANGE_PASSWORD_RESULT.ERROR);
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
  });

  it("does not throw when Supabase is not available", async () => {
    getSupabaseClientMock.mockImplementation(() => {
      throw new Error("Faltan las variables");
    });

    expect(await changePassword(PARAMS)).toBe(CHANGE_PASSWORD_RESULT.ERROR);
  });
});

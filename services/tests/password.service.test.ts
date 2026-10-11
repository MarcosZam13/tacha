import { beforeEach, describe, expect, it, vi } from "vitest";
import { PASSWORD_UPDATE_RESULT } from "@/constants";
import { updateUserPassword } from "../password.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con el único método que se usa.
const updateUserMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ auth: { updateUser: updateUserMock } }),
}));

beforeEach(() => {
  vi.resetAllMocks();
});

describe("updateUserPassword", () => {
  it("sends only the new password, with the current session", async () => {
    updateUserMock.mockResolvedValue({ data: {}, error: null });

    await updateUserPassword("Tacha2026!");

    expect(updateUserMock).toHaveBeenCalledWith({ password: "Tacha2026!" });
  });

  it("reports success when Supabase accepts the password", async () => {
    updateUserMock.mockResolvedValue({ data: {}, error: null });

    expect(await updateUserPassword("Tacha2026!")).toBe(PASSWORD_UPDATE_RESULT.SUCCESS);
  });

  it("tells apart a password equal to the current one", async () => {
    updateUserMock.mockResolvedValue({ data: null, error: { code: "same_password" } });

    expect(await updateUserPassword("Tacha2026!")).toBe(PASSWORD_UPDATE_RESULT.SAME_PASSWORD);
  });

  it("tells apart a password rejected by the project's policy", async () => {
    updateUserMock.mockResolvedValue({ data: null, error: { code: "weak_password" } });

    expect(await updateUserPassword("Tacha2026!")).toBe(PASSWORD_UPDATE_RESULT.REJECTED);
  });

  it.each([
    ["an unknown error code", { code: "unexpected_failure" }],
    ["an error without a code", { code: undefined }],
  ])("reports a generic error for %s, never the raw Supabase message", async (_label, error) => {
    updateUserMock.mockResolvedValue({ data: null, error: { ...error, message: "internal detail" } });

    expect(await updateUserPassword("Tacha2026!")).toBe(PASSWORD_UPDATE_RESULT.ERROR);
  });
});

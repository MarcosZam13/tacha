import { beforeEach, describe, expect, it, vi } from "vitest";
import { USER_METADATA_KEY } from "@/constants";
import {
  COMPLETE_SIGN_UP_ACCOUNT_STATUS,
  COMPLETE_SIGN_UP_SAVE_RESULT,
} from "../constants/complete-sign-up.constants";
import { SOCIAL_PROVIDER, SOCIAL_SIGN_UP_COMPLETED_KEY } from "../constants/social-sign-up.constants";
import { getCompleteSignUpAccount, saveCompletedSignUp } from "../services/complete-sign-up.service";

const { getUser, refreshSession, updateUser } = vi.hoisted(() => ({
  getUser: vi.fn(),
  refreshSession: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ auth: { getUser, refreshSession, updateUser } }),
}));

const mockServerUser = (userMetadata: Record<string, string>): void => {
  getUser.mockResolvedValue({
    data: {
      user: {
        app_metadata: { provider: SOCIAL_PROVIDER.GOOGLE },
        email: "ana@correo.com",
        is_anonymous: false,
        user_metadata: userMetadata,
      },
    },
    error: null,
  });
};

beforeEach(() => {
  vi.clearAllMocks();
  refreshSession.mockResolvedValue({ error: null });
});

describe("getCompleteSignUpAccount", () => {
  it("validates the account with the server", async () => {
    mockServerUser({ name: "Ana" });

    expect(await getCompleteSignUpAccount()).toEqual({
      name: "Ana",
      status: COMPLETE_SIGN_UP_ACCOUNT_STATUS.PENDING,
    });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  // Completado en otro dispositivo: la sesión guardada todavía no tiene la marca.
  it("refreshes the stored session when the server says there is nothing to complete", async () => {
    mockServerUser({ name: "Ana", [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16" });

    const account = await getCompleteSignUpAccount();

    expect(account.status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED);
    expect(refreshSession).toHaveBeenCalledOnce();
  });

  it("still lets the account in when the session cannot be refreshed", async () => {
    mockServerUser({ name: "Ana", [SOCIAL_SIGN_UP_COMPLETED_KEY]: "2026-11-16" });
    refreshSession.mockRejectedValue(new TypeError("Failed to fetch"));

    expect((await getCompleteSignUpAccount()).status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NOT_NEEDED);
  });

  it("reports no account without a valid session", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("no session") });

    expect((await getCompleteSignUpAccount()).status).toBe(COMPLETE_SIGN_UP_ACCOUNT_STATUS.NO_ACCOUNT);
  });
});

describe("saveCompletedSignUp", () => {
  // SCRUM-43, CA-03
  it("saves the trimmed name together with the completed mark", async () => {
    updateUser.mockResolvedValue({ error: null });

    const result = await saveCompletedSignUp("  Ana Pérez  ");

    expect(result).toBe(COMPLETE_SIGN_UP_SAVE_RESULT.SUCCESS);
    expect(updateUser).toHaveBeenCalledWith({
      data: { [USER_METADATA_KEY.NAME]: "Ana Pérez", [SOCIAL_SIGN_UP_COMPLETED_KEY]: expect.any(String) },
    });
  });

  it("reports an error when Supabase does not save", async () => {
    updateUser.mockResolvedValue({ error: new Error("failed") });

    expect(await saveCompletedSignUp("Ana")).toBe(COMPLETE_SIGN_UP_SAVE_RESULT.ERROR);
  });
});

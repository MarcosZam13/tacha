import { beforeEach, describe, expect, it, vi } from "vitest";
import { HOUSEHOLD_DB, HOUSEHOLD_JOIN_RESULT } from "../constants/household.constants";
import { acceptHouseholdInvite, hasRegisteredSession } from "../services/household.service";

// Sin Supabase real: getSupabaseClient devuelve un cliente falso con un rpc y
// un getSession de prueba.
const rpcMock = vi.fn();
const getSessionMock = vi.fn();

vi.mock("@/services/supabase.client", () => ({
  getSupabaseClient: () => ({ auth: { getSession: getSessionMock }, rpc: rpcMock }),
}));

// Token inventado con formato de UUID (no es uno real de la base).
const TOKEN = "3f2b8c1e-9a4d-4e7b-8c6f-1a2b3c4d5e6f";
const UNKNOWN_RESULT_MESSAGE = `${HOUSEHOLD_DB.RPC.ACCEPT_HOUSEHOLD_INVITE} devolvió un resultado desconocido`;

describe("acceptHouseholdInvite", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it.each(Object.values(HOUSEHOLD_JOIN_RESULT))("returns %s when the database answers it", async (joinResult) => {
    rpcMock.mockResolvedValue({ data: joinResult, error: null });

    await expect(acceptHouseholdInvite(TOKEN)).resolves.toBe(joinResult);
  });

  it("calls accept_household_invite with only the invite token", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_JOIN_RESULT.JOINED, error: null });

    await acceptHouseholdInvite(TOKEN);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    // Nombre literal a propósito: fija el contrato con la base (migración 014)
    // aunque alguien cambie la constante por error.
    expect(rpcMock).toHaveBeenCalledWith("accept_household_invite", { invite_token: TOKEN });
  });

  it("throws on a result outside the contract and does not expose the token", async () => {
    rpcMock.mockResolvedValue({ data: "approved", error: null });

    const joinAttempt = acceptHouseholdInvite(TOKEN);

    await expect(joinAttempt).rejects.toThrow(UNKNOWN_RESULT_MESSAGE);
    await expect(joinAttempt).rejects.not.toThrow(TOKEN);
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "Se requiere una cuenta registrada para unirse a un household" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(acceptHouseholdInvite(TOKEN)).rejects.toBe(supabaseError);
  });
});

// La página de invitación decide "sin cuenta" con esta función: una sesión
// anónima tiene que contar igual que no tener sesión.
describe("hasRegisteredSession", () => {
  beforeEach(() => {
    getSessionMock.mockReset();
  });

  it("is false without a session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null }, error: null });

    await expect(hasRegisteredSession()).resolves.toBe(false);
  });

  it("is false with an anonymous session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { is_anonymous: true } } }, error: null });

    await expect(hasRegisteredSession()).resolves.toBe(false);
  });

  it("is true with a registered session", async () => {
    getSessionMock.mockResolvedValue({ data: { session: { user: { is_anonymous: false } } }, error: null });

    await expect(hasRegisteredSession()).resolves.toBe(true);
  });
});

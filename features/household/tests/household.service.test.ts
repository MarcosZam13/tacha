import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOUSEHOLD_DB,
  HOUSEHOLD_JOIN_RESULT,
  HOUSEHOLD_LEAVE_RESULT,
  HOUSEHOLD_LISTS_CHOICE,
  HOUSEHOLD_LISTS_DECISION_RESULT,
  HOUSEHOLD_LISTS_DECISION_STATE,
  HOUSEHOLD_ROLE,
} from "../constants/household.constants";
import {
  acceptHouseholdInvite,
  decidePersonalLists,
  getHouseholdMembers,
  getPersonalListsDecisionState,
  hasRegisteredSession,
  leaveHousehold,
} from "../services/household.service";

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

// Ids y nombres inventados (no son de la base).
const ADMIN_ID = "a1b2c3d4-0000-4000-8000-000000000001";
const MEMBER_ID = "a1b2c3d4-0000-4000-8000-000000000002";
const UNNAMED_MEMBER_ID = "a1b2c3d4-0000-4000-8000-000000000003";
const MEMBER_NAME = "Beto";
const UNKNOWN_ROLE_MESSAGE = `${HOUSEHOLD_DB.RPC.GET_HOUSEHOLD_MEMBERS} devolvió un rol desconocido`;
const UNKNOWN_LEAVE_RESULT_MESSAGE = `${HOUSEHOLD_DB.RPC.LEAVE_HOUSEHOLD} devolvió un resultado desconocido`;

describe("getHouseholdMembers", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it("calls get_household_members without arguments", async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    await getHouseholdMembers();

    expect(rpcMock).toHaveBeenCalledTimes(1);
    // Nombre literal a propósito: fija el contrato con la base (migración 023).
    expect(rpcMock).toHaveBeenCalledWith("get_household_members");
  });

  it("maps every row in the order the database sends, keeping a missing name as null", async () => {
    rpcMock.mockResolvedValue({
      data: [
        { display_name: "Ana", is_current_user: true, role: HOUSEHOLD_ROLE.ADMIN, user_id: ADMIN_ID },
        { display_name: MEMBER_NAME, is_current_user: false, role: HOUSEHOLD_ROLE.MEMBER, user_id: MEMBER_ID },
        { display_name: null, is_current_user: false, role: HOUSEHOLD_ROLE.MEMBER, user_id: UNNAMED_MEMBER_ID },
      ],
      error: null,
    });

    await expect(getHouseholdMembers()).resolves.toEqual([
      { displayName: "Ana", isCurrentUser: true, role: HOUSEHOLD_ROLE.ADMIN, userId: ADMIN_ID },
      { displayName: MEMBER_NAME, isCurrentUser: false, role: HOUSEHOLD_ROLE.MEMBER, userId: MEMBER_ID },
      { displayName: null, isCurrentUser: false, role: HOUSEHOLD_ROLE.MEMBER, userId: UNNAMED_MEMBER_ID },
    ]);
  });

  it("throws on a role outside the contract without exposing the member id or name", async () => {
    rpcMock.mockResolvedValue({
      data: [{ display_name: MEMBER_NAME, is_current_user: false, role: "owner", user_id: MEMBER_ID }],
      error: null,
    });

    const membersRequest = getHouseholdMembers();

    await expect(membersRequest).rejects.toThrow(UNKNOWN_ROLE_MESSAGE);
    await expect(membersRequest).rejects.not.toThrow(MEMBER_ID);
    await expect(membersRequest).rejects.not.toThrow(MEMBER_NAME);
  });

  it("rethrows the Supabase error when the caller is not the admin", async () => {
    const supabaseError = { code: "42501", message: "Solo el admin del household puede ver los miembros" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getHouseholdMembers()).rejects.toBe(supabaseError);
  });
});

describe("leaveHousehold", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it.each(Object.values(HOUSEHOLD_LEAVE_RESULT))("returns %s when the database answers it", async (leaveResult) => {
    rpcMock.mockResolvedValue({ data: leaveResult, error: null });

    await expect(leaveHousehold(MEMBER_ID)).resolves.toBe(leaveResult);
  });

  it("calls leave_household with the chosen new admin", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LEAVE_RESULT.LEFT, error: null });

    await leaveHousehold(MEMBER_ID);

    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock).toHaveBeenCalledWith("leave_household", { new_admin_user_id: MEMBER_ID });
  });

  it("does not send a new admin when none is chosen, so the database uses its default", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LEAVE_RESULT.TRANSFER_REQUIRED, error: null });

    await leaveHousehold();

    const [, rpcArgs] = rpcMock.mock.calls[0];
    // Lo que viaja en el cuerpo del pedido: sin la clave, nunca con null.
    expect(JSON.stringify(rpcArgs)).toBe("{}");
  });

  it("throws on a result outside the contract and does not expose the chosen id", async () => {
    rpcMock.mockResolvedValue({ data: "removed", error: null });

    const leaveAttempt = leaveHousehold(MEMBER_ID);

    await expect(leaveAttempt).rejects.toThrow(UNKNOWN_LEAVE_RESULT_MESSAGE);
    await expect(leaveAttempt).rejects.not.toThrow(MEMBER_ID);
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "Se requiere una cuenta registrada para salir de un household" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(leaveHousehold()).rejects.toBe(supabaseError);
  });
});

// SCRUM-59: la pregunta por la lista personal.
const UNKNOWN_DECISION_STATE_MESSAGE = `${HOUSEHOLD_DB.RPC.GET_PERSONAL_LISTS_DECISION_STATE} devolvió un estado desconocido`;
const UNKNOWN_DECISION_RESULT_MESSAGE = `${HOUSEHOLD_DB.RPC.DECIDE_PERSONAL_LISTS} devolvió un resultado desconocido`;

describe("getPersonalListsDecisionState", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it.each(Object.values(HOUSEHOLD_LISTS_DECISION_STATE))("returns %s when the database answers it", async (state) => {
    rpcMock.mockResolvedValue({ data: state, error: null });

    await expect(getPersonalListsDecisionState()).resolves.toBe(state);
  });

  it("calls get_personal_lists_decision_state without arguments", async () => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LISTS_DECISION_STATE.PENDING, error: null });

    await getPersonalListsDecisionState();

    // Nombre literal a propósito: fija el contrato con la base (migración 024).
    expect(rpcMock).toHaveBeenCalledWith("get_personal_lists_decision_state");
  });

  it("throws on a state outside the contract", async () => {
    rpcMock.mockResolvedValue({ data: "maybe", error: null });

    await expect(getPersonalListsDecisionState()).rejects.toThrow(UNKNOWN_DECISION_STATE_MESSAGE);
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "42501", message: "Se requiere una cuenta registrada para decidir sobre tus listas" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(getPersonalListsDecisionState()).rejects.toBe(supabaseError);
  });
});

describe("decidePersonalLists", () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it.each(Object.values(HOUSEHOLD_LISTS_DECISION_RESULT))("returns %s when the database answers it", async (result) => {
    rpcMock.mockResolvedValue({ data: result, error: null });

    await expect(decidePersonalLists(HOUSEHOLD_LISTS_CHOICE.SHARE)).resolves.toBe(result);
  });

  it.each(Object.values(HOUSEHOLD_LISTS_CHOICE))("sends only the choice %s", async (choice) => {
    rpcMock.mockResolvedValue({ data: HOUSEHOLD_LISTS_DECISION_RESULT.KEPT, error: null });

    await decidePersonalLists(choice);

    expect(rpcMock).toHaveBeenCalledWith("decide_personal_lists", { lists_choice: choice });
  });

  it("throws on a result outside the contract", async () => {
    rpcMock.mockResolvedValue({ data: "deleted", error: null });

    await expect(decidePersonalLists(HOUSEHOLD_LISTS_CHOICE.KEEP)).rejects.toThrow(UNKNOWN_DECISION_RESULT_MESSAGE);
  });

  it("rethrows the Supabase error", async () => {
    const supabaseError = { code: "22023", message: "La opción tiene que ser keep o share" };
    rpcMock.mockResolvedValue({ data: null, error: supabaseError });

    await expect(decidePersonalLists(HOUSEHOLD_LISTS_CHOICE.SHARE)).rejects.toBe(supabaseError);
  });
});

import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/services/supabase.client";
import type { Database } from "@/types/database.types";
import type { NullableRef } from "@/types/nullable.types";
import {
  HOUSEHOLD_DB,
  HOUSEHOLD_JOIN_RESULT,
  HOUSEHOLD_LEAVE_RESULT,
  HOUSEHOLD_LISTS_DECISION_RESULT,
  HOUSEHOLD_LISTS_DECISION_STATE,
  HOUSEHOLD_MEMBERS_PAGE,
  HOUSEHOLD_REMOVE_MEMBER_RESULT,
  HOUSEHOLD_ROLE,
  HOUSEHOLD_ROUTE,
} from "../constants/household.constants";
import type {
  HouseholdJoinResultType,
  HouseholdLeaveResultType,
  HouseholdListsChoiceType,
  HouseholdListsDecisionResultType,
  HouseholdListsDecisionStateType,
  HouseholdRemoveMemberResultType,
  HouseholdRoleType,
} from "../constants/household.constants";
import type { HouseholdInvite } from "../models/HouseholdInvite.interface";
import type { HouseholdMember } from "../models/HouseholdMember.interface";
import type { HouseholdMembersPage } from "../models/HouseholdMembersPage.interface";
import type { HouseholdMembership } from "../models/HouseholdMembership.interface";

// Lo que devuelven create_household_invite y get_household_invite por cada fila.
type HouseholdInviteRow = Database["public"]["Functions"]["get_household_invite"]["Returns"][number];

// La pantalla no ve el token suelto: recibe el link ya armado. El origen sale
// del navegador (localhost en desarrollo, el dominio real en producción);
// este servicio solo se llama desde el navegador.
const toHouseholdInvite = (inviteRow: HouseholdInviteRow): HouseholdInvite => ({
  expiresAt: Date.parse(inviteRow.expires_at),
  url: `${window.location.origin}${HOUSEHOLD_ROUTE.INVITATION}/${inviteRow.token}`,
});

// La sesión guardada en el navegador. Usa getSession y no ensureSession a
// propósito: abrir la pantalla de household nunca crea un usuario anónimo.
const getStoredSession = async (): Promise<NullableRef<Session>> => {
  const { data: sessionData, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;

  return sessionData.session;
};

/**
 * true si hay una sesión de un usuario registrado: los anónimos no pueden
 * tener household. Solo decide qué mostrar; las RPC rechazan igual a quien no
 * tenga cuenta.
 */
export const hasRegisteredSession = async (): Promise<boolean> => {
  const session = await getStoredSession();

  return Boolean(session) && !session?.user.is_anonymous;
};

/**
 * La membresía del usuario actual, o null si no pertenece a ningún household.
 * Filtra por el usuario actual además de lo que permite RLS: hoy la política
 * solo deja ver la fila propia, pero cuando HU-35 deje ver a los demás
 * miembros, maybeSingle seguiría recibiendo una sola fila (un usuario tiene
 * como máximo una membresía).
 */
export const getHouseholdMembership = async (): Promise<NullableRef<HouseholdMembership>> => {
  const session = await getStoredSession();
  // Sin sesión no hay membresía que buscar (la pantalla ya muestra "sin cuenta").
  if (!session) return null;

  const { data: membershipRow, error } = await getSupabaseClient()
    .from(HOUSEHOLD_DB.TABLE.HOUSEHOLD_MEMBERS)
    .select(HOUSEHOLD_DB.MEMBERSHIP_SELECT)
    .eq(HOUSEHOLD_DB.COLUMN.USER_ID, session.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!membershipRow) return null;

  return {
    householdName: membershipRow.households.name,
    // role es text en la base; el check de la migración 011 garantiza que es admin o member.
    role: membershipRow.role as HouseholdRoleType,
  };
};

/**
 * Crea el household y deja al usuario actual como admin, en una sola
 * transacción de create_household. No devuelve nada: quien llama vuelve a
 * leer la membresía para mostrar lo que quedó en la base.
 */
export const createHousehold = async (householdName: string): Promise<void> => {
  const { error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.CREATE_HOUSEHOLD, {
    household_name: householdName,
  });
  if (error) throw error;
};

/**
 * El link del household del admin, vigente o vencido (la pantalla muestra
 * "Expirado"), o null si todavía no generó ninguno. Si quien llama no es
 * admin, la base responde con error.
 */
export const getHouseholdInvite = async (): Promise<NullableRef<HouseholdInvite>> => {
  const { data: inviteRows, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.GET_HOUSEHOLD_INVITE);
  if (error) throw error;

  const [inviteRow] = inviteRows;
  return inviteRow ? toHouseholdInvite(inviteRow) : null;
};

/**
 * Genera o regenera el link. Token y vencimiento los decide la base; al
 * regenerar, el token anterior deja de existir en la misma operación.
 */
export const createHouseholdInvite = async (): Promise<HouseholdInvite> => {
  const { data: inviteRows, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.CREATE_HOUSEHOLD_INVITE);
  if (error) throw error;

  const [inviteRow] = inviteRows;
  // create_household_invite siempre devuelve la fila que insertó o reemplazó.
  if (!inviteRow) throw new Error(`${HOUSEHOLD_DB.RPC.CREATE_HOUSEHOLD_INVITE} no devolvió el enlace`);

  return toHouseholdInvite(inviteRow);
};

// Los únicos resultados que puede devolver accept_household_invite (migración 014).
const HOUSEHOLD_JOIN_RESULT_VALUES: readonly string[] = Object.values(HOUSEHOLD_JOIN_RESULT);

// La RPC devuelve text (string en los tipos): se acota a los 5 valores del
// contrato en vez de confiar en un `as`.
const isHouseholdJoinResult = (joinResult: string): joinResult is HouseholdJoinResultType =>
  HOUSEHOLD_JOIN_RESULT_VALUES.includes(joinResult);

/**
 * Une al usuario actual a la familia del enlace con ese token. El cliente solo
 * manda el token: quién se une, a qué familia y con qué rol lo decide la base
 * (accept_household_invite, contrato en specs/SPEC.md §12). Sin cuenta
 * registrada, la base responde con error (42501).
 *
 * Los errores no llevan el token ni lo que devolvió la base: el token es la
 * llave de la invitación y no debe terminar en un log.
 */
export const acceptHouseholdInvite = async (inviteToken: string): Promise<HouseholdJoinResultType> => {
  const { data: joinResult, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.ACCEPT_HOUSEHOLD_INVITE, {
    invite_token: inviteToken,
  });
  if (error) throw error;

  // Un valor fuera del contrato es un error de integración, no un resultado.
  if (!isHouseholdJoinResult(joinResult)) {
    throw new Error(`${HOUSEHOLD_DB.RPC.ACCEPT_HOUSEHOLD_INVITE} devolvió un resultado desconocido`);
  }

  return joinResult;
};

// Los únicos roles que permite el check de household_members (migración 011).
const HOUSEHOLD_ROLE_VALUES: readonly string[] = Object.values(HOUSEHOLD_ROLE);

const isHouseholdRole = (role: string): role is HouseholdRoleType => HOUSEHOLD_ROLE_VALUES.includes(role);

// Una fila de get_household_members o de get_household_members_page (misma forma).
type HouseholdMemberRow = Database["public"]["Functions"]["get_household_members_page"]["Returns"][number];

// La fila de la base → el modelo. rpcName solo va en el mensaje de error, que
// no lleva el id ni el nombre del miembro.
const toHouseholdMember = (memberRow: HouseholdMemberRow, rpcName: string): HouseholdMember => {
  // role es text en la base: se acota en vez de confiar en un `as`.
  if (!isHouseholdRole(memberRow.role)) {
    throw new Error(`${rpcName} devolvió un rol desconocido`);
  }

  return {
    displayName: memberRow.display_name,
    isCurrentUser: memberRow.is_current_user,
    role: memberRow.role,
    userId: memberRow.user_id,
  };
};

/**
 * Los miembros del household del admin que llama, en el orden en que se
 * unieron, para elegir a quién pasarle el rol antes de salir. Si quien llama
 * no es admin (o no tiene cuenta), la base responde con error (42501).
 *
 * El nombre puede venir en null: la pantalla decide qué mostrar. El error de
 * un rol desconocido no lleva el id ni el nombre del miembro.
 */
export const getHouseholdMembers = async (): Promise<HouseholdMember[]> => {
  const { data: memberRows, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.GET_HOUSEHOLD_MEMBERS);
  if (error) throw error;

  return memberRows.map((memberRow) => toHouseholdMember(memberRow, HOUSEHOLD_DB.RPC.GET_HOUSEHOLD_MEMBERS));
};

/**
 * Una página de los integrantes de la familia de quien llama (SCRUM-60). La
 * puede pedir cualquier miembro; la familia la decide la base a partir de la
 * sesión. Sin cuenta registrada, la base responde con error (42501); sin
 * familia, una página vacía.
 *
 * Pide una fila de más para saber si hay otra página sin contar el total. La
 * búsqueda va tal como la escribió el usuario: la base la recorta, no
 * distingue mayúsculas, busca %, _ y \ como texto y rechaza más de 60
 * caracteres (22023).
 */
export const getHouseholdMembersPage = async (
  searchQuery: string,
  pageOffset: number,
): Promise<HouseholdMembersPage> => {
  const { data: memberRows, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.GET_HOUSEHOLD_MEMBERS_PAGE, {
    page_offset: pageOffset,
    page_size: HOUSEHOLD_MEMBERS_PAGE.SIZE + 1,
    search_query: searchQuery,
  });
  if (error) throw error;

  return {
    hasMore: memberRows.length > HOUSEHOLD_MEMBERS_PAGE.SIZE,
    members: memberRows
      .slice(0, HOUSEHOLD_MEMBERS_PAGE.SIZE)
      .map((memberRow) => toHouseholdMember(memberRow, HOUSEHOLD_DB.RPC.GET_HOUSEHOLD_MEMBERS_PAGE)),
  };
};

// Los únicos resultados que puede devolver leave_household (migración 023).
const HOUSEHOLD_LEAVE_RESULT_VALUES: readonly string[] = Object.values(HOUSEHOLD_LEAVE_RESULT);

const isHouseholdLeaveResult = (leaveResult: string): leaveResult is HouseholdLeaveResultType =>
  HOUSEHOLD_LEAVE_RESULT_VALUES.includes(leaveResult);

/**
 * Saca al usuario actual de su household (leave_household, contrato en
 * specs/SPEC.md §12). Quién sale, de qué household y si el elegido es válido
 * lo decide la base, en una sola transacción.
 *
 * newAdminUserId solo cuenta cuando sale el admin y quedan otros miembros; si
 * no se pasa, no viaja y la base usa su default null. Para un miembro, o para
 * el admin que es el único miembro, la base lo ignora.
 *
 * Los errores no llevan el id elegido ni lo que devolvió la base.
 */
export const leaveHousehold = async (newAdminUserId?: string): Promise<HouseholdLeaveResultType> => {
  const { data: leaveResult, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.LEAVE_HOUSEHOLD, {
    new_admin_user_id: newAdminUserId,
  });
  if (error) throw error;

  // Un valor fuera del contrato es un error de integración, no un resultado.
  if (!isHouseholdLeaveResult(leaveResult)) {
    throw new Error(`${HOUSEHOLD_DB.RPC.LEAVE_HOUSEHOLD} devolvió un resultado desconocido`);
  }

  return leaveResult;
};

// Los únicos resultados que puede devolver remove_household_member (migración 026).
const HOUSEHOLD_REMOVE_MEMBER_RESULT_VALUES: readonly string[] = Object.values(HOUSEHOLD_REMOVE_MEMBER_RESULT);

const isHouseholdRemoveMemberResult = (removeResult: string): removeResult is HouseholdRemoveMemberResultType =>
  HOUSEHOLD_REMOVE_MEMBER_RESULT_VALUES.includes(removeResult);

/**
 * El admin elimina a un integrante de su familia (SCRUM-61, migración 026).
 * El cliente manda solo el user_id de esa persona: la familia y el rol de
 * quien llama los decide la base a partir de la sesión, y solo borra la
 * membresía (los datos personales de la persona no se tocan).
 *
 * Los errores no llevan el id de la persona ni lo que devolvió la base.
 */
export const removeHouseholdMember = async (memberUserId: string): Promise<HouseholdRemoveMemberResultType> => {
  const { data: removeResult, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.REMOVE_HOUSEHOLD_MEMBER, {
    member_user_id: memberUserId,
  });
  if (error) throw error;

  // Un valor fuera del contrato es un error de integración, no un resultado.
  if (!isHouseholdRemoveMemberResult(removeResult)) {
    throw new Error(`${HOUSEHOLD_DB.RPC.REMOVE_HOUSEHOLD_MEMBER} devolvió un resultado desconocido`);
  }

  return removeResult;
};

// Los únicos valores que puede devolver get_personal_lists_decision_state (migración 024).
const HOUSEHOLD_LISTS_DECISION_STATE_VALUES: readonly string[] = Object.values(HOUSEHOLD_LISTS_DECISION_STATE);

const isHouseholdListsDecisionState = (decisionState: string): decisionState is HouseholdListsDecisionStateType =>
  HOUSEHOLD_LISTS_DECISION_STATE_VALUES.includes(decisionState);

/**
 * Si corresponde preguntarle a quien llama qué hacer con su lista personal
 * (SCRUM-59): 'pending' solo si es miembro, todavía no decidió en esta
 * familia y su lista personal tiene pendientes. Lo decide la base; sin cuenta
 * registrada responde con error (42501).
 */
export const getPersonalListsDecisionState = async (): Promise<HouseholdListsDecisionStateType> => {
  const { data: decisionState, error } = await getSupabaseClient().rpc(
    HOUSEHOLD_DB.RPC.GET_PERSONAL_LISTS_DECISION_STATE,
  );
  if (error) throw error;

  if (!isHouseholdListsDecisionState(decisionState)) {
    throw new Error(`${HOUSEHOLD_DB.RPC.GET_PERSONAL_LISTS_DECISION_STATE} devolvió un estado desconocido`);
  }

  return decisionState;
};

// Los únicos resultados que puede devolver decide_personal_lists (migración 024).
const HOUSEHOLD_LISTS_DECISION_RESULT_VALUES: readonly string[] = Object.values(HOUSEHOLD_LISTS_DECISION_RESULT);

const isHouseholdListsDecisionResult = (decisionResult: string): decisionResult is HouseholdListsDecisionResultType =>
  HOUSEHOLD_LISTS_DECISION_RESULT_VALUES.includes(decisionResult);

/**
 * Guarda la decisión sobre la lista personal. Con "share", la base pasa los
 * pendientes a la lista de la familia en la misma transacción. Qué familia,
 * qué lista y si ya había decidido lo resuelve la base: el cliente solo manda
 * la opción.
 */
export const decidePersonalLists = async (
  listsChoice: HouseholdListsChoiceType,
): Promise<HouseholdListsDecisionResultType> => {
  const { data: decisionResult, error } = await getSupabaseClient().rpc(HOUSEHOLD_DB.RPC.DECIDE_PERSONAL_LISTS, {
    lists_choice: listsChoice,
  });
  if (error) throw error;

  if (!isHouseholdListsDecisionResult(decisionResult)) {
    throw new Error(`${HOUSEHOLD_DB.RPC.DECIDE_PERSONAL_LISTS} devolvió un resultado desconocido`);
  }

  return decisionResult;
};

import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/services/supabase.client";
import type { Database } from "@/types/database.types";
import type { NullableRef } from "@/types/nullable.types";
import { HOUSEHOLD_DB, HOUSEHOLD_ROUTE } from "../constants/household.constants";
import type { HouseholdJoinResultType, HouseholdRoleType } from "../constants/household.constants";
import type { HouseholdInvite } from "../models/HouseholdInvite.interface";
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

/**
 * Une al usuario actual a la familia del enlace con ese token. El cliente solo
 * manda el token: quién se une, a qué familia y con qué rol lo decide la base
 * (accept_household_invite, contrato en specs/SPEC.md §12).
 *
 * Pendiente de la etapa de backend de SCRUM-57: la RPC todavía no existe, así
 * que por ahora falla siempre y la página muestra el error de unión. No se
 * simula ningún resultado: los tests mockean esta función.
 */
export const acceptHouseholdInvite: (inviteToken: string) => Promise<HouseholdJoinResultType> = async () => {
  throw new Error(`${HOUSEHOLD_DB.RPC.ACCEPT_HOUSEHOLD_INVITE} todavía no existe en la base`);
};

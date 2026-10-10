import { POSTGRES_ERROR_CODE } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import { PURCHASE_SESSION_DB } from "../constants/purchase-session.constants";
import type { PurchaseSession } from "../models/PurchaseSession.interface";
import type { StoreOption } from "../models/StoreOption.interface";
import { startOfLocalDay } from "../utils/startOfLocalDay";

/** Los supermercados para elegir al iniciar una compra. Catálogo público (lectura abierta). */
export const getStores = async (): Promise<StoreOption[]> => {
  const { data: stores, error } = await getSupabaseClient()
    .from(PURCHASE_SESSION_DB.TABLE.STORES)
    .select(PURCHASE_SESSION_DB.STORES_SELECT)
    .order("display_name");
  if (error) throw error;

  return stores.map((store) => ({ id: store.id, name: store.display_name }));
};

/**
 * Inicia una compra en un súper o retoma la que el usuario ya tenía abierta
 * hoy ahí (HU-36f CA-05). "Hoy" empieza en la medianoche local, igual que
 * "Tachados hoy". Devuelve el id de la compra.
 */
export const startPurchaseSession = async (storeId: string): Promise<string> => {
  await ensureSession();

  const { data: session, error } = await getSupabaseClient().rpc(PURCHASE_SESSION_DB.RPC.START, {
    local_day_start: startOfLocalDay(new Date()),
    target_store_id: storeId,
  });
  if (error) throw error;

  return session.id;
};

/**
 * La compra de la URL, si sigue abierta y es del usuario. null si está
 * cerrada, es ajena (RLS no la deja ver), no existe o el id ni siquiera es un
 * uuid: para la pantalla los cuatro casos son "esa compra ya no está abierta".
 */
export const getPurchaseSession = async (sessionId: string): Promise<NullableRef<PurchaseSession>> => {
  await ensureSession();

  const { data: session, error } = await getSupabaseClient()
    .from(PURCHASE_SESSION_DB.TABLE.PURCHASE_SESSIONS)
    .select(PURCHASE_SESSION_DB.SESSION_SELECT)
    .eq("id", sessionId)
    .is("closed_at", null)
    .maybeSingle();
  if (error?.code === POSTGRES_ERROR_CODE.INVALID_TEXT_REPRESENTATION) return null;
  if (error) throw error;
  if (!session) return null;

  return { id: session.id, storeName: session.stores.display_name };
};

/**
 * Cierra la compra con el total (null = "sin total", documento-proyecto §4.6).
 * La base solo deja cerrar una compra propia y abierta.
 */
export const closePurchaseSession = async (sessionId: string, spentTotal: NullableRef<number>): Promise<void> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(PURCHASE_SESSION_DB.RPC.CLOSE, {
    // La base acepta null (lo prueba supabase/tests/016_…). Los tipos que
    // genera Supabase nunca marcan como nullable un parámetro de función, así
    // que este es el único lugar donde se le aclara a TypeScript.
    spent_total: spentTotal as number,
    target_session_id: sessionId,
  });
  if (error) throw error;
};

import { POSTGRES_ERROR_CODE } from "@/constants";
import type { CatalogBaseUnitType } from "@/constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import { SHOPPING_LIST_DB } from "../constants/shopping-list.constants";
import type { PresentationRow, ResolveShortfallPayload } from "../models/shortfall-resolution.types";

/** Si la base aplicó el cambio. false = la fila ya no está como la ve la pantalla. */
export interface ShortfallMutationResponse {
  isApplied: boolean;
}

// Otro miembro destachó o borró la fila después de que se cargó la lista (sin
// tiempo real, SCRUM-155): la base responde P0002 (ya no se ve) o 22023 (ya
// no está tachada). No es un error para mostrar: la pantalla recarga y cierra.
const isStaleRowError = (code: string): boolean =>
  code === POSTGRES_ERROR_CODE.NO_DATA_FOUND || code === POSTGRES_ERROR_CODE.INVALID_PARAMETER_VALUE;

/**
 * Guarda lo que eligió el usuario en "¿Qué hiciste?" (SPEC §18, regla 36):
 * una unidad más, otra presentación o descartar los avisos de la fila. Toda la
 * regla vive en la base (resolve_list_item_shortfall, 037), que también guarda
 * la foto para deshacer y comprueba el acceso de la familia.
 */
export const resolveShortfall = async (payload: ResolveShortfallPayload): Promise<ShortfallMutationResponse> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(SHOPPING_LIST_DB.RPC.RESOLVE_LIST_ITEM_SHORTFALL, {
    resolution: payload.resolution,
    target_item_id: payload.itemId,
    target_variant_id: payload.variantId,
  });
  if (error && isStaleRowError(error.code)) return { isApplied: false };
  if (error) throw error;

  return { isApplied: true };
};

/**
 * Destachar deshaciendo lo que eligió el panel (regla 45): la base vuelve la
 * fila a su presentación y cantidad de antes y la destacha con
 * set_list_item_checked (035), todo en una transacción. Si al destachar se
 * junta con una pendiente, la fila deja de existir: la pantalla recarga.
 */
export const undoShortfallResolutionAndUncheck = async (itemId: string): Promise<ShortfallMutationResponse> => {
  await ensureSession();

  const { error } = await getSupabaseClient().rpc(SHOPPING_LIST_DB.RPC.UNDO_SHORTFALL_RESOLUTION_AND_UNCHECK, {
    target_item_id: itemId,
  });
  if (error && isStaleRowError(error.code)) return { isApplied: false };
  if (error) throw error;

  return { isApplied: true };
};

/**
 * Las presentaciones del producto madre de una variante, con sus precios, en
 * una sola petición (catálogo público, como el detalle de SCRUM-64). Los
 * precios vienen de una vista que no garantiza columnas no nulas: se
 * descartan los nulos en vez de contarlos como ₡0.
 */
export const getProductPresentations = async (variantId: string): Promise<PresentationRow[]> => {
  const { data: variant, error } = await getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.VARIANTS)
    .select(SHOPPING_LIST_DB.PRESENTATIONS_SELECT)
    .eq("id", variantId)
    .single();
  if (error) throw error;

  return variant.product_catalog.product_catalog_variants.map((presentation) => ({
    baseQuantity: presentation.base_quantity,
    // base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
    baseUnit: presentation.base_unit as CatalogBaseUnitType,
    prices: presentation.latest_prices.flatMap(({ price }) => (price === null ? [] : [price])),
    variantId: presentation.id,
  }));
};

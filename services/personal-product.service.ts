import type { Session } from "@supabase/supabase-js";
import { CREATE_PRODUCT_FORM_DB } from "@/constants/create-product-form.constants";
import type { CatalogBaseUnitType } from "@/constants/catalog.constants";
import { ensureSession, getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";

/** Lo que necesita create_personal_product (migración 031), ya en camelCase. */
export interface CreatePersonalProductPayload {
  baseQuantity: number;
  baseUnit: CatalogBaseUnitType;
  /** Vacío/ausente: no se crea product_brands (ver migración, sección 3). */
  brandName?: string;
  categoryId: string;
  name: string;
  shareWithHousehold: boolean;
}

/**
 * Crea el producto personal (SCRUM-87 / HU-56): producto + variante de
 * tamaño (+ marca si se dio) en una sola transacción, vía create_personal_product
 * (migración 031) — nunca un insert directo: product_catalog/
 * product_catalog_variants no dan INSERT a authenticated (confirmado contra
 * la base real, ver plan.md §Dependencias verificadas).
 *
 * household_id lo resuelve la base con auth.uid() contra household_members;
 * share_with_household solo viaja como intención, nunca un household_id del
 * cliente (misma regla de seguridad que el resto de las RPC security definer
 * del proyecto, ej. ensure_general_list_id).
 *
 * ensureSession() y no getSession(): un usuario anónimo también puede crear
 * productos personales (caso 2 de supabase/tests/031_create_personal_product.test.sql
 * — solo la validación de datos lo frena, no la sesión), igual que ya hace
 * addVariantToGeneralList() en services/list-items.service.ts.
 *
 * Devuelve el id del producto creado; no lanza por un error de validación
 * del servidor (22023): ese caso no debería darse porque useCreateProductForm
 * ya valida antes de llamar (CA-02), así que cualquier error que llegue aquí
 * es un error genérico para quien llama.
 */
export const createPersonalProduct = async (payload: CreatePersonalProductPayload): Promise<string> => {
  await ensureSession();

  const { data: productId, error } = await getSupabaseClient().rpc(
    CREATE_PRODUCT_FORM_DB.RPC.CREATE_PERSONAL_PRODUCT,
    {
      base_quantity: payload.baseQuantity,
      base_unit: payload.baseUnit,
      brand_name: payload.brandName,
      category_id: payload.categoryId,
      product_name: payload.name,
      share_with_household: payload.shareWithHousehold,
    },
  );
  if (error) throw error;

  return productId;
};

// Consulta propia y mínima: no se reusa getHouseholdMembership() de
// features/household porque esa expone householdName/role, no lo que este
// formulario necesita (solo si existe o no un household) — mismo criterio
// que ya documenta getCurrentHouseholdId() en
// features/my-products/services/my-products.service.ts (plan.md, decisión 4).
const getStoredSession = async (): Promise<NullableRef<Session>> => {
  const { data: sessionData, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;

  return sessionData.session;
};

/**
 * true si el usuario actual pertenece a algún household. Decide si
 * CreateProductForm muestra el checkbox "Compartir con mi household"
 * (SPEC.md §5: "si no pertenece a ninguno, el checkbox no se muestra").
 * Sin sesión (todavía no se abrió el formulario ni se creó ninguna anónima):
 * false, sin consultar la base.
 */
export const hasHousehold = async (): Promise<boolean> => {
  const session = await getStoredSession();
  if (!session) return false;

  const { data: membershipRow, error } = await getSupabaseClient()
    .from(CREATE_PRODUCT_FORM_DB.TABLE.HOUSEHOLD_MEMBERS)
    .select(CREATE_PRODUCT_FORM_DB.COLUMN.USER_ID)
    .eq(CREATE_PRODUCT_FORM_DB.COLUMN.USER_ID, session.user.id)
    .maybeSingle();
  if (error) throw error;

  return membershipRow !== null;
};

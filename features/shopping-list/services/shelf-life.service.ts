import { getSupabaseClient } from "@/services/supabase.client";
import type { NullableRef } from "@/types/nullable.types";
import type { ShelfLifeChoiceType } from "../constants/shelf-life.constants";
import { SHOPPING_LIST_DB } from "../constants/shopping-list.constants";

/**
 * Guarda (o borra, con null) el chip de una fila tachada (SCRUM-103). Update
 * directo, como el tachado (015): la base solo deja escribir esa columna, en
 * filas de listas visibles, y la borra si la fila está pendiente (063).
 * Se pide la fila de vuelta: sin ella, una fila que la RLS no deja tocar
 * respondería "sin error" sin haber guardado nada.
 */
export const saveShelfLifeChoice = async (
  itemId: string,
  choice: NullableRef<ShelfLifeChoiceType>,
): Promise<void> => {
  const { error } = await getSupabaseClient()
    .from(SHOPPING_LIST_DB.TABLE.LIST_ITEMS)
    .update({ shelf_life_choice: choice })
    .eq("id", itemId)
    .select("id")
    .single();
  if (error) throw error;
};

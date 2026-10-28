import { STORE_ICON_PATH_BY_SLUG } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

/**
 * Ícono de una tienda por su slug (plan.md §1.2): null si la tienda no está
 * entre las 3 conocidas, o si latest_prices no trajo slug para esa fila.
 */
export const getStoreIconPath = (storeSlug: NullableRef<string>): NullableRef<string> =>
  storeSlug !== null && storeSlug in STORE_ICON_PATH_BY_SLUG
    ? STORE_ICON_PATH_BY_SLUG[storeSlug as keyof typeof STORE_ICON_PATH_BY_SLUG]
    : null;

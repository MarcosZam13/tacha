import { useEffect, useState } from "react";
import { hasHousehold } from "@/services/personal-product.service";
import type { NullableRef } from "@/types/nullable.types";
import { HOUSEHOLD_LIST_BLOCK } from "../constants/catalog-product-detail.constants";
import type { HouseholdListBlockType } from "../constants/catalog-product-detail.constants";

/** La respuesta de hasHousehold() junto al variantId que la pidió. */
interface HouseholdAnswer {
  isInHousehold: boolean;
  variantId: string;
}

/**
 * SCRUM-163: si el producto es personal sin compartir y el usuario está en una
 * familia, su lista general es la de la familia y el resto no podría verlo
 * (RLS de la 032). Solo para un producto personal se pregunta si hay familia;
 * mientras no responde, "checking": la vista no ofrece agregar, porque un
 * toque en ese lapso metería el producto en la lista de la familia.
 */
export const useHouseholdListBlock = (isPersonalProduct: boolean, variantId: string): HouseholdListBlockType => {
  const [answer, setAnswer] = useState<NullableRef<HouseholdAnswer>>(null);

  useEffect(() => {
    let isCancelled = false;

    if (isPersonalProduct) {
      hasHousehold()
        .then((isInHousehold) => {
          if (!isCancelled) setAnswer({ isInHousehold, variantId });
        })
        // A propósito no bloquea si la consulta falla: la lista ya tolera una
        // fila que otro miembro no puede leer (SPEC de shopping-list §19, regla 1).
        .catch(() => {
          if (!isCancelled) setAnswer({ isInHousehold: false, variantId });
        });
    }

    return () => {
      isCancelled = true;
    };
  }, [isPersonalProduct, variantId]);

  if (!isPersonalProduct) return HOUSEHOLD_LIST_BLOCK.ALLOWED;
  // Una respuesta de otro producto no cuenta: este todavía se está consultando.
  if (answer?.variantId !== variantId) return HOUSEHOLD_LIST_BLOCK.CHECKING;
  return answer.isInHousehold ? HOUSEHOLD_LIST_BLOCK.BLOCKED : HOUSEHOLD_LIST_BLOCK.ALLOWED;
};

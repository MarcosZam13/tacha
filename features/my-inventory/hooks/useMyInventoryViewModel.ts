import { useEffect, useRef, useState } from "react";
import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
import type { NullableRef } from "@/types/nullable.types";
import { MY_INVENTORY_STATUS, MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import type { MyInventoryStatusType } from "../constants/my-inventory.constants";
import type { InventoryItem } from "../models/InventoryItem.interface";
import type { InventoryRowError, MyInventoryViewModel } from "../models/MyInventoryViewModel.interface";
import { adjustInventoryItem, getMyInventory, markInventoryItemUsedUp } from "../services/my-inventory.service";
import { toInventoryGroups } from "../utils/toInventoryGroups";

interface MyInventoryResponse {
  errorMessage: NullableRef<string>;
  items: InventoryItem[];
}

const toStatus = (response: NullableRef<MyInventoryResponse>, groupCount: number): MyInventoryStatusType => {
  if (response === null) return MY_INVENTORY_STATUS.LOADING;
  if (response.errorMessage !== null) return MY_INVENTORY_STATUS.ERROR;
  if (groupCount === 0) return MY_INVENTORY_STATUS.EMPTY;
  return MY_INVENTORY_STATUS.READY;
};

const withoutId = (ids: readonly string[], id: string): string[] => ids.filter((current) => current !== id);

/**
 * "Mi inventario" (SCRUM-105). Se pide una vez al montar y con "Reintentar"
 * (servicio + efecto, nextjs-enterprise-patterns §3, como "Mis grupos").
 *
 * SCRUM-106: "Ya se acabó" esconde la fila en el momento (CA-01) y la vuelve a
 * mostrar con su error si no se pudo guardar, como el ✓ de las sugerencias.
 * Un chip guarda y vuelve a pedir el inventario sin el spinner, porque el
 * producto cambia de grupo y de días (la base hace la cuenta). Después de
 * cada acción se avisa al lector de pantalla y el foco no se pierde: va al
 * título si la fila desapareció, o a "Ajustar fecha" de esa fila en su grupo nuevo.
 */
export const useMyInventoryViewModel = (): MyInventoryViewModel => {
  const [response, setResponse] = useState<NullableRef<MyInventoryResponse>>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);
  // No se vacía al guardar bien: la base ya no los devuelve, y así una recarga en curso tampoco los muestra.
  const [hiddenVariantIds, setHiddenVariantIds] = useState<string[]>([]);
  const [savingVariantIds, setSavingVariantIds] = useState<string[]>([]);
  const [adjustingVariantId, setAdjustingVariantId] = useState<NullableRef<string>>(null);
  const [rowError, setRowError] = useState<NullableRef<InventoryRowError>>(null);
  const [focusVariantId, setFocusVariantId] = useState<NullableRef<string>>(null);
  const [announcement, setAnnouncement] = useState<string>("");
  const [titleFocusRequest, setTitleFocusRequest] = useState<number>(0);
  // La fila que se acaba de ajustar: cuando llega el inventario nuevo, recibe el foco.
  const adjustedVariantIdRef = useRef<NullableRef<string>>(null);

  useEffect(() => {
    let isCancelled = false;

    getMyInventory()
      .then((items) => {
        if (isCancelled) return;
        setResponse({ errorMessage: null, items });
        setFocusVariantId(adjustedVariantIdRef.current);
        adjustedVariantIdRef.current = null;
      })
      .catch(() => {
        if (isCancelled) return;
        const adjustedVariantId = adjustedVariantIdRef.current;
        adjustedVariantIdRef.current = null;
        // Después de un chip guardado, la lista sigue en pantalla: solo esa fila avisa.
        if (adjustedVariantId !== null) {
          setRowError({ message: MY_INVENTORY_TEXT.REFRESH_ERROR, variantId: adjustedVariantId });
          return;
        }
        setResponse({ errorMessage: MY_INVENTORY_TEXT.ERROR, items: [] });
      });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const reload = (): void => {
    setResponse(null);
    setRefreshKey((key) => key + 1);
  };

  const productNameOf = (variantId: string): string =>
    response?.items.find((item) => item.variantId === variantId)?.productName ?? "";

  const onUsedUp = (variantId: string): void => {
    setRowError(null);
    setAdjustingVariantId((current) => (current === variantId ? null : current));
    setHiddenVariantIds((ids) => [...ids, variantId]);
    setAnnouncement(`${productNameOf(variantId)}${MY_INVENTORY_TEXT.USED_UP_SUFFIX}`);
    setTitleFocusRequest((request) => request + 1);
    markInventoryItemUsedUp(variantId).catch(() => {
      setHiddenVariantIds((ids) => withoutId(ids, variantId));
      setAnnouncement("");
      setRowError({ message: MY_INVENTORY_TEXT.ACTION_ERROR, variantId });
    });
  };

  const onToggleAdjust = (variantId: string): void => {
    setRowError(null);
    setAdjustingVariantId((current) => (current === variantId ? null : variantId));
  };

  const onAdjust = (variantId: string, choice: ShelfLifeChoiceType): void => {
    setRowError(null);
    setSavingVariantIds((ids) => [...ids, variantId]);
    adjustInventoryItem(variantId, choice)
      .then(() => {
        setAdjustingVariantId((current) => (current === variantId ? null : current));
        setAnnouncement(`${productNameOf(variantId)}${MY_INVENTORY_TEXT.ADJUSTED_SUFFIX}`);
        adjustedVariantIdRef.current = variantId;
        // Sin setResponse(null): la lista sigue en pantalla mientras llega la nueva.
        setRefreshKey((key) => key + 1);
      })
      .catch(() => setRowError({ message: MY_INVENTORY_TEXT.ACTION_ERROR, variantId }))
      .finally(() => setSavingVariantIds((ids) => withoutId(ids, variantId)));
  };

  const onFocused = (): void => setFocusVariantId(null);

  const visibleItems = (response?.items ?? []).filter((item) => !hiddenVariantIds.includes(item.variantId));
  const groups = toInventoryGroups(visibleItems, new Date());

  return {
    actions: {
      adjustingVariantId,
      focusVariantId,
      onAdjust,
      onFocused,
      onToggleAdjust,
      onUsedUp,
      rowError,
      savingVariantIds,
    },
    announcement,
    errorMessage: response?.errorMessage ?? null,
    groups,
    reload,
    status: toStatus(response, groups.length),
    titleFocusRequest,
  };
};

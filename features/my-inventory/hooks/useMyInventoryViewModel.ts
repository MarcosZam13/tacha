import { useEffect, useRef, useState } from "react";
import type { ShelfLifeChoiceType } from "@/features/shopping-list/constants/shelf-life.constants";
import type { NullableRef } from "@/types/nullable.types";
import { MY_INVENTORY_STATUS, MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import type { MyInventoryStatusType } from "../constants/my-inventory.constants";
import type { InventoryItem } from "../models/InventoryItem.interface";
import type { InventoryRowError, MyInventoryViewModel } from "../models/MyInventoryViewModel.interface";
import { adjustInventoryItem, getMyInventory, markInventoryItemUsedUp } from "../services/my-inventory.service";
import { toInventoryGroups } from "../utils/toInventoryGroups";
import { useAddInventoryItem } from "./useAddInventoryItem";

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

/** El último aviso y cuántos van: así dos avisos iguales seguidos se leen los dos. */
interface Announcement {
  count: number;
  text: string;
}

// Espacio duro: no se ve ni se lee, pero cambia el texto de la región.
const ANNOUNCEMENT_REPEAT_MARK = "\u00A0";

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
  const [announcement, setAnnouncement] = useState<Announcement>({ count: 0, text: "" });
  const [titleFocusRequest, setTitleFocusRequest] = useState<number>(0);
  // La fila que se acaba de ajustar o agregar: cuando llega el inventario nuevo, recibe el foco.
  const adjustedVariantIdRef = useRef<NullableRef<string>>(null);

  const announce = (text: string): void => setAnnouncement((current) => ({ count: current.count + 1, text }));

  // SCRUM-107: lo agregado a mano aparece como cualquier otro (CA-02) al volver a pedir el inventario.
  const addItem = useAddInventoryItem((product) => {
    // Si se había marcado "Ya se acabó" en esta pantalla, vuelve: es una llegada nueva.
    setHiddenVariantIds((ids) => withoutId(ids, product.variantId));
    announce(`${product.productName}${MY_INVENTORY_TEXT.ADDED_SUFFIX}`);
    adjustedVariantIdRef.current = product.variantId;
    setRefreshKey((key) => key + 1);
  });

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
    // El panel no sigue abierto por detrás del error: al volver, empieza cerrado.
    addItem.cancel();
    setResponse(null);
    setRefreshKey((key) => key + 1);
  };

  const productNameOf = (variantId: string): string =>
    response?.items.find((item) => item.variantId === variantId)?.productName ?? "";

  const onUsedUp = (variantId: string): void => {
    setRowError(null);
    setAdjustingVariantId((current) => (current === variantId ? null : current));
    setHiddenVariantIds((ids) => [...ids, variantId]);
    announce(`${productNameOf(variantId)}${MY_INVENTORY_TEXT.USED_UP_SUFFIX}`);
    setTitleFocusRequest((request) => request + 1);
    markInventoryItemUsedUp(variantId).catch(() => {
      setHiddenVariantIds((ids) => withoutId(ids, variantId));
      // El aviso de "ya no está" dejó de ser cierto: se borra (el error de la fila ya se anuncia).
      setAnnouncement((current) => ({ count: current.count, text: "" }));
      setRowError({ message: MY_INVENTORY_TEXT.ACTION_ERROR, variantId });
      // OBS-1 de la PR #124: la fila vuelve y el foco con ella, no queda en el título.
      setFocusVariantId(variantId);
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
        announce(`${productNameOf(variantId)}${MY_INVENTORY_TEXT.ADJUSTED_SUFFIX}`);
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
  // Un error de una fila que no está en pantalla (por ejemplo, se agregó algo
  // nuevo y no se pudo recargar): lo muestra la pantalla, debajo del título.
  const pageNotice =
    rowError !== null && !visibleItems.some((item) => item.variantId === rowError.variantId) ? rowError.message : null;

  // Abrir el panel cierra los chips de "Ajustar fecha": nunca hay dos grupos de chips a la vez.
  const openAddItem = (): void => {
    setAdjustingVariantId(null);
    addItem.open();
  };
  const status = toStatus(response, groups.length);
  // SPEC §17 regla 1: con productos y en el vacío; no mientras carga ni si no cargó.
  const canAdd = status === MY_INVENTORY_STATUS.READY || status === MY_INVENTORY_STATUS.EMPTY;

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
    addItem: { ...addItem, isOpen: addItem.isOpen && canAdd, open: openAddItem },
    canAdd,
    pageNotice,
    // OBS-2 de la PR #124: el mismo aviso dos veces seguidas es el mismo texto y
    // el lector no lo repite; un espacio que alterna lo hace distinto.
    announcement: `${announcement.text}${announcement.count % 2 === 0 ? "" : ANNOUNCEMENT_REPEAT_MARK}`,
    errorMessage: response?.errorMessage ?? null,
    groups,
    reload,
    status,
    titleFocusRequest,
  };
};

import { useEffect, useState } from "react";
import type { NullableRef } from "@/types/nullable.types";
import { MY_INVENTORY_STATUS, MY_INVENTORY_TEXT } from "../constants/my-inventory.constants";
import type { MyInventoryStatusType } from "../constants/my-inventory.constants";
import type { InventoryItem } from "../models/InventoryItem.interface";
import type { MyInventoryViewModel } from "../models/MyInventoryViewModel.interface";
import { getMyInventory } from "../services/my-inventory.service";
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

/**
 * "Mi inventario" (SCRUM-105). Se pide una vez al montar y con "Reintentar"
 * (servicio + efecto, nextjs-enterprise-patterns §3, como "Mis grupos").
 */
export const useMyInventoryViewModel = (): MyInventoryViewModel => {
  const [response, setResponse] = useState<NullableRef<MyInventoryResponse>>(null);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  useEffect(() => {
    let isCancelled = false;

    getMyInventory()
      .then((items) => {
        if (!isCancelled) setResponse({ errorMessage: null, items });
      })
      .catch(() => {
        if (!isCancelled) setResponse({ errorMessage: MY_INVENTORY_TEXT.ERROR, items: [] });
      });

    return () => {
      isCancelled = true;
    };
  }, [refreshKey]);

  const reload = (): void => {
    setResponse(null);
    setRefreshKey((key) => key + 1);
  };

  const groups = toInventoryGroups(response?.items ?? [], new Date());

  return {
    errorMessage: response?.errorMessage ?? null,
    groups,
    reload,
    status: toStatus(response, groups.length),
  };
};

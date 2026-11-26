import type { NullableRef } from "@/types/nullable.types";
import {
  INVENTORY_DAYS_LIMIT,
  INVENTORY_GROUP,
  INVENTORY_GROUP_ORDER,
  INVENTORY_GROUP_TITLE,
  MY_INVENTORY_TEXT,
} from "../constants/my-inventory.constants";
import type { InventoryGroupType } from "../constants/my-inventory.constants";
import type { InventoryItem } from "../models/InventoryItem.interface";
import type { InventoryGroupViewModel } from "../models/MyInventoryViewModel.interface";
import { toDaysLeft } from "./toDaysLeft";

/** El grupo de un producto según los días que le quedan (CA-01). */
export const toInventoryGroup = (daysLeft: NullableRef<number>): InventoryGroupType => {
  if (daysLeft === null) return INVENTORY_GROUP.NO_DATE;
  if (daysLeft <= INVENTORY_DAYS_LIMIT.SOON_MAX) return INVENTORY_GROUP.SOON;
  if (daysLeft <= INVENTORY_DAYS_LIMIT.THIS_MONTH_MAX) return INVENTORY_GROUP.THIS_MONTH;
  return INVENTORY_GROUP.LATER;
};

/** "Se acaba hoy", "Te queda 1 día", "Te quedan 5 días" (CA-02). */
export const toRemainingText = (daysLeft: number): string => {
  if (daysLeft === 0) return MY_INVENTORY_TEXT.REMAINING_TODAY;
  if (daysLeft === 1) return MY_INVENTORY_TEXT.REMAINING_ONE_DAY;
  return `${MY_INVENTORY_TEXT.REMAINING_DAYS_PREFIX} ${daysLeft} ${MY_INVENTORY_TEXT.REMAINING_DAYS_SUFFIX}`;
};

/**
 * Los productos agrupados por urgencia, en el orden de INVENTORY_GROUP_ORDER.
 * Dentro de cada grupo se respeta el orden de la base (lo que se acaba antes
 * primero). Los grupos sin productos no se devuelven.
 */
export const toInventoryGroups = (items: InventoryItem[], now: Date): InventoryGroupViewModel[] => {
  const itemsByGroup = new Map<InventoryGroupType, InventoryGroupViewModel["items"]>();

  items.forEach((item) => {
    const daysLeft = item.expectedOutAt === null ? null : toDaysLeft(item.expectedOutAt, now);
    const group = toInventoryGroup(daysLeft);
    const groupItems = itemsByGroup.get(group) ?? [];
    groupItems.push({
      productName: item.productName,
      remainingText: daysLeft === null ? null : toRemainingText(daysLeft),
      sizeLabel: item.sizeLabel,
      variantId: item.variantId,
    });
    itemsByGroup.set(group, groupItems);
  });

  return INVENTORY_GROUP_ORDER.filter((group) => itemsByGroup.has(group)).map((group) => ({
    group,
    items: itemsByGroup.get(group) ?? [],
    title: INVENTORY_GROUP_TITLE[group],
  }));
};

import type { DateListStatusType } from "../constants/date-lists.constants";

/** Una sublista por fecha. eventDate es YYYY-MM-DD, sin hora (SPEC §5, regla 4). */
export interface DateList {
  eventDate: string;
  id: string;
  name: string;
  status: DateListStatusType;
}

export interface DateListItem {
  id: string;
  productName: string;
  quantity: number;
  sizeLabel: string;
  variantId: string;
}

export interface DateListDetail extends DateList {
  items: DateListItem[];
}

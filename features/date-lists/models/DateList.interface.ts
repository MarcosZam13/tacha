import type { DateListStatusType } from "@/constants";
import type { NullableRef } from "@/types/nullable.types";

/** Una sublista por fecha. eventDate es YYYY-MM-DD, sin hora (SPEC §5, regla 4). */
export interface DateList {
  eventDate: string;
  id: string;
  name: string;
  /** Total gastado en colones (SCRUM-79, SPEC §10). null = "Sin total". No cuenta en Finanzas. */
  spentTotal: NullableRef<number>;
  status: DateListStatusType;
}

export interface DateListItem {
  id: string;
  isChecked: boolean;
  productName: string;
  quantity: number;
  sizeLabel: string;
  variantId: string;
}

export interface DateListDetail extends DateList {
  items: DateListItem[];
}

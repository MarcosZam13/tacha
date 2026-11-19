import type { NullableRef } from "@/types/nullable.types";

export interface SetItemAssigneePayload {
  /** `null` quita al encargado. */
  assigneeId: NullableRef<string>;
  itemId: string;
}

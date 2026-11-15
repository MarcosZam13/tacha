import type { NullableRef } from "@/types/nullable.types";

/**
 * Una fila de `lists` con su ajuste embebido, tal como la devuelve LIST_SETTINGS_DB.SELECT. `name` y
 * `event_date` son nulos en la lista general; `list_settings` es nulo si la lista nunca tuvo ajuste.
 */
export interface ListSettingsRow {
  event_date: NullableRef<string>;
  household_id: NullableRef<string>;
  id: string;
  list_settings: NullableRef<{ assignee_enabled: boolean }>;
  name: NullableRef<string>;
  type: string;
}

import type { ListSettingsStatusType } from "../constants/list-settings.constants";
import type { SettableList } from "./SettableList.interface";

/** Lo que `useListSettingsViewModel` le entrega a ListSettings.tsx, ya calculado. */
export interface ListSettingsViewModel {
  /** El error del último guardado de cada lista; la lista que falló conserva su valor anterior. */
  errorByListId: Record<string, string>;
  lists: SettableList[];
  onRetry: () => void;
  onToggle: (listId: string) => void;
  /** Las listas con un guardado en curso: su interruptor queda deshabilitado. */
  savingListIds: string[];
  status: ListSettingsStatusType;
}

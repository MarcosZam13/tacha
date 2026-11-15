import type { NullableUndefined } from "@/types/nullable.types";
import type { SettableList } from "../../models/SettableList.interface";

export interface ListSettingsRowProps {
  errorMessage: NullableUndefined<string>;
  isSaving: boolean;
  list: SettableList;
  onToggle: () => void;
}

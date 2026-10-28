import type { NullableRef } from "@/types/nullable.types";
import type { StoreOption } from "./StoreOption.interface";

/** Lo que dibuja el modal de supermercados (StorePicker), ya calculado. */
export interface StorePickerViewModel {
  errorMessage: NullableRef<string>;
  isLoading: boolean;
  isOpen: boolean;
  isStarting: boolean;
  onClose: () => void;
  onPickStore: (storeId: string) => void;
  stores: StoreOption[];
}

import type { StoreSlug } from "@/app/constants";

export interface HouseholdStorePreference {
  household_id: string;
  store_id: string;
  store_slug: StoreSlug;
  display_name: string;
  visible: boolean;
}

export interface HouseholdStorePreferencesState {
  preferences: HouseholdStorePreference[];
  isLoading: boolean;
  error: string | null;
}

export interface StorePreferenceUpdate {
  household_id: string;
  store_slug: StoreSlug;
  visible: boolean;
}

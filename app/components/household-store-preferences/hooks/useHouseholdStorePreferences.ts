import { useState, useEffect } from "react";
import type {
  HouseholdStorePreference,
  HouseholdStorePreferencesState,
  StorePreferenceUpdate,
} from "@/app/types/household-preferences.types";
import type { StoreSlug } from "@/app/constants";
import { STORE_NAMES } from "@/app/constants";

const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const SUPABASE_URL = "https://ifvwumejbfpowxlkjfiu.supabase.co";

interface UseHouseholdStorePreferencesReturn {
  state: HouseholdStorePreferencesState;
  toggleStoreVisibility: (storeSlug: StoreSlug, visible: boolean) => Promise<void>;
}

export const useHouseholdStorePreferences = (
  householdId: string | null
): UseHouseholdStorePreferencesReturn => {
  const [state, setState] = useState<HouseholdStorePreferencesState>({
    preferences: [],
    isLoading: false,
    error: null,
  });

  // Cargar preferencias al montar o si cambia householdId
  useEffect(() => {
    if (!householdId) {
      setState({
        preferences: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    loadPreferences();
  }, [householdId]);

  const loadPreferences = async (): Promise<void> => {
    if (!householdId) return;

    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
    }));

    try {
      // Cargar todas las tiendas + preferencias del household
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/stores?select=id,slug,display_name`,
        {
          method: "GET",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status} al cargar tiendas`);
      }

      const stores = (await response.json()) as Array<{
        id: string;
        slug: StoreSlug;
        display_name: string;
      }>;

      // Cargar preferencias específicas del household
      const prefsResponse = await fetch(
        `${SUPABASE_URL}/rest/v1/household_store_preferences?household_id=eq.${householdId}&select=store_id,visible`,
        {
          method: "GET",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      const preferences: Record<string, boolean> = {};
      if (prefsResponse.ok) {
        const prefs = await prefsResponse.json() as Array<{
          store_id: string;
          visible: boolean;
        }>;
        prefs.forEach((p) => {
          preferences[p.store_id] = p.visible;
        });
      }

      // Combinar: todas las tiendas + preferencias (con default visible=true)
      const combinedPreferences: HouseholdStorePreference[] = stores.map(
        (store) => ({
          household_id: householdId,
          store_id: store.id,
          store_slug: store.slug,
          display_name: store.display_name,
          visible: preferences[store.id] !== undefined
            ? preferences[store.id]
            : true, // Default: visible
        })
      );

      setState({
        preferences: combinedPreferences,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  };

  const toggleStoreVisibility = async (
    storeSlug: StoreSlug,
    visible: boolean
  ): Promise<void> => {
    if (!householdId) return;

    // Buscar el store_id correspondiente al slug
    const storeToUpdate = state.preferences.find(
      (p) => p.store_slug === storeSlug
    );
    if (!storeToUpdate) return;

    // Optimistic update
    setState((prev) => ({
      ...prev,
      preferences: prev.preferences.map((p) =>
        p.store_slug === storeSlug ? { ...p, visible } : p
      ),
    }));

    try {
      // Upsert: insert or update en household_store_preferences
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/household_store_preferences`,
        {
          method: "POST",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${ANON_KEY}`,
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates", // Hacer upsert automático
          },
          body: JSON.stringify({
            household_id: householdId,
            store_id: storeToUpdate.store_id,
            visible,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status} al guardar preferencia`);
      }
    } catch (err) {
      // Revertir optimistic update si falla
      const errorMessage =
        err instanceof Error ? err.message : "Error desconocido";
      setState((prev) => ({
        ...prev,
        preferences: prev.preferences.map((p) =>
          p.store_slug === storeSlug
            ? { ...p, visible: !visible } // Revertir
            : p
        ),
        error: errorMessage,
      }));
    }
  };

  return {
    state,
    toggleStoreVisibility,
  };
};

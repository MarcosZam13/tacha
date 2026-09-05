"use client";

import { useHouseholdStorePreferences } from "./hooks/useHouseholdStorePreferences";

interface HouseholdStorePreferencesProps {
  householdId: string | null;
}

export const HouseholdStorePreferences = ({
  householdId,
}: HouseholdStorePreferencesProps): JSX.Element | null => {
  const { state, toggleStoreVisibility } =
    useHouseholdStorePreferences(householdId);

  // Si no hay householdId, no mostrar nada
  if (!householdId) {
    return null;
  }

  // Si está cargando
  if (state.isLoading) {
    return (
      <div className="space-y-2 p-6 bg-gray-50 rounded-lg border border-gray-300">
        <h3 className="font-semibold text-gray-900">Tiendas visibles</h3>
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6 bg-gray-50 rounded-lg border border-gray-300">
      <div>
        <h3 className="font-semibold text-gray-900 mb-4">
          Tiendas que quiero ver
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Selecciona cuáles de estos supermercados quieres que aparezcan en tu
          catálogo. Todas están habilitadas por defecto.
        </p>
      </div>

      {state.error && (
        <div className="bg-red-100 border border-red-400 text-red-800 px-4 py-2 rounded text-sm">
          {state.error}
        </div>
      )}

      <div className="space-y-3">
        {state.preferences.map((pref) => (
          <label
            key={pref.store_slug}
            className="flex items-center p-3 bg-white border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={pref.visible}
              onChange={(e) =>
                toggleStoreVisibility(pref.store_slug, e.target.checked)
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <span className="ml-3 font-medium text-gray-900">
              {pref.display_name}
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-gray-500">
        💡 Los precios mostrados en el catálogo se filtran según las tiendas que
        selecciones aquí.
      </p>
    </div>
  );
};

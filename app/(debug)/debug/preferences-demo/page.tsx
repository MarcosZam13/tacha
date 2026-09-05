"use client";

import { useState } from "react";
import { HouseholdStorePreferences } from "@/app/components/household-store-preferences/HouseholdStorePreferences";

export default function PreferencesDemoPage(): JSX.Element {
  const [householdId, setHouseholdId] = useState("test-household-123");
  const [showPrefs, setShowPrefs] = useState(false);

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        🏪 Preferencias: Tiendas por Household
      </h1>
      <p className="text-gray-700 mb-6">
        Configura qué tiendas quieres ver. Los toggles actualizan en Supabase y
        filtran automáticamente los precios en el catálogo.
      </p>

      <div className="space-y-6">
        {/* Selector de Household */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-300">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Household ID para testear:
              </label>
              <input
                type="text"
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
                placeholder="UUID o string cualquiera"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Usa el mismo household_id en la búsqueda de catálogo para ver cómo
                filtra los precios
              </p>
            </div>

            <button
              onClick={() => setShowPrefs(!showPrefs)}
              className="w-full px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition"
            >
              {showPrefs ? "Ocultar" : "Mostrar"} Preferencias
            </button>
          </div>
        </div>

        {/* Componente de preferencias */}
        {showPrefs && householdId && (
          <HouseholdStorePreferences householdId={householdId} />
        )}

        {/* Guía de testing */}
        <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg">
          <p className="text-sm text-blue-900 font-semibold mb-3">
            🧪 Cómo probar:
          </p>
          <ol className="text-sm text-blue-800 space-y-2">
            <li>
              1️⃣ <strong>Ingresa un household_id</strong> (ej. test-household-123)
            </li>
            <li>2️⃣ <strong>Muestra preferencias</strong> — verás 3 tiendas</li>
            <li>3️⃣ <strong>Desactiva Walmart</strong> — se crea/actualiza fila en BD</li>
            <li>
              4️⃣ <strong>Ve a Búsqueda</strong> y busca con el mismo household_id
            </li>
            <li>
              5️⃣ <strong>Compara rango de precios</strong> — Walmart debe estar
              ausente
            </li>
          </ol>
        </div>

        {/* Info técnica */}
        <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg">
          <p className="text-sm text-gray-900 font-semibold mb-2">
            💡 Integración:
          </p>
          <p className="text-sm text-gray-700 mb-3">
            El componente que ves es el mismo que usaría un agente en la pantalla
            de configuración del household. Usa:
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>
              ✅ <code className="bg-white px-2 py-1 rounded">LEFT JOIN + coalesce(visible, true)</code> para lectura
            </li>
            <li>
              ✅ <code className="bg-white px-2 py-1 rounded">UPSERT</code> para escritura (sin duplicados)
            </li>
            <li>
              ✅ Optimistic UI update + rollback si falla
            </li>
          </ul>
        </div>

        {/* Verificación en Supabase */}
        <div className="bg-purple-50 border border-purple-300 p-4 rounded-lg">
          <p className="text-sm text-purple-900 font-semibold mb-2">
            🔍 Verificación en Supabase:
          </p>
          <p className="text-sm text-purple-800 mb-2">
            Ejecuta esto en SQL Editor para ver las preferencias guardadas:
          </p>
          <code className="block bg-white p-3 rounded text-xs text-gray-800 overflow-x-auto">
            select * from household_store_preferences <br />
            where household_id = '{householdId}';
          </code>
        </div>
      </div>
    </main>
  );
}

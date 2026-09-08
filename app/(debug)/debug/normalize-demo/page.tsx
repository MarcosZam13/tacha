"use client";

import { useState, type JSX } from "react";
import { SUPABASE_REST } from "@/app/constants";

interface NormalizeResult {
  processed: number;
  matched: number;
  rejected: number;
}

export default function NormalizeDemoPage(): JSX.Element {
  const [batchSize, setBatchSize] = useState(50);
  const [result, setResult] = useState<NormalizeResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNormalize = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // FIX QA bug #5 (2026-09-04): URL hardcodeada -> SUPABASE_REST.BASE_URL
      const response = await fetch(
        `${SUPABASE_REST.BASE_URL}/rpc/normalize_pending_staging`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ batch_size: batchSize }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setResult(data[0]); // RPC devuelve array
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        ⚙️ Normalización: Staging → Catálogo
      </h1>
      <p className="text-gray-700 mb-6">
        Procesa filas de staging (datos crudos) y conviértelas en catálogo normalizado.
        Parsea tamaños, crea variantes, marcas y precios.
      </p>

      <div className="space-y-6">
        {/* Controles */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-300">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Tamaño del lote (max filas a procesar):
              </label>
              <input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(0, parseInt(e.target.value) || 0))}
                min="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleNormalize}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 transition"
            >
              {isLoading ? "Procesando..." : "Ejecutar Normalización"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-800 p-4 rounded-lg">
            <p className="font-semibold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Resultado */}
        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg text-center">
                <p className="text-sm text-blue-900 font-medium">Procesadas</p>
                <p className="text-3xl font-bold text-blue-600">{result.processed}</p>
              </div>
              <div className="bg-green-50 border border-green-300 p-4 rounded-lg text-center">
                <p className="text-sm text-green-900 font-medium">Matched ✓</p>
                <p className="text-3xl font-bold text-green-600">{result.matched}</p>
              </div>
              <div className="bg-orange-50 border border-orange-300 p-4 rounded-lg text-center">
                <p className="text-sm text-orange-900 font-medium">Rejected ✗</p>
                <p className="text-3xl font-bold text-orange-600">{result.rejected}</p>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-300 p-4 rounded-lg">
              <p className="text-sm text-indigo-900 mb-3">
                <strong>Próximos pasos:</strong>
              </p>
              <ul className="text-sm text-indigo-800 space-y-2">
                <li>
                  ✅ Ve a <strong>Búsqueda: Catálogo Normalizado</strong> y busca un
                  producto
                </li>
                <li>
                  ✅ Verifica en Supabase Table Editor que se crearon filas en{" "}
                  <code className="bg-white px-1 rounded">product_catalog</code>
                </li>
                <li>
                  ✅ Si hay rejected, revisa{" "}
                  <code className="bg-white px-1 rounded">product_catalog_staging</code>{" "}
                  para ver por qué
                </li>
              </ul>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-gray-50 border border-gray-300 p-4 rounded-lg">
          <p className="text-sm text-gray-900 font-semibold mb-2">
            📝 Cómo funciona:
          </p>
          <ol className="text-sm text-gray-700 space-y-2">
            <li>1. Toma filas de product_catalog_staging con status=pending</li>
            <li>2. Parsea scraped_size_text (&quot;1L&quot; → ml, 1000)</li>
            <li>3. Busca/crea product_catalog con similitud pg_trgm</li>
            <li>4. Busca/crea variante y marca</li>
            <li>5. Extrae precio y lo inserta en product_prices</li>
            <li>6. Marca fila como matched (o rejected si hubo error)</li>
          </ol>
        </div>
      </div>
    </main>
  );
}

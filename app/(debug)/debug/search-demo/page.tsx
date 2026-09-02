"use client";

import { useState } from "react";

interface SearchResult {
  product_catalog_id: string;
  name: string;
  category: string | null;
  variants: Array<{
    variant_id: string;
    name: string;
    base_unit: string;
    base_quantity: number;
    image_url: string | null;
    brands: Array<{
      brand_id: string;
      name: string;
      logo_url: string | null;
    }>;
    price_ranges: Record<string, { min: number; max: number }>;
  }>;
}

export default function SearchDemoPage(): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("leche");
  const [householdId, setHouseholdId] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        "https://ifvwumejbfpowxlkjfiu.supabase.co/rest/v1/rpc/search_catalog",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            search_term: searchTerm,
            household_id: householdId || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Búsqueda: Catálogo Normalizado</h1>
      <p className="text-gray-700 mb-6">
        Prueba la función RPC search_catalog. Devuelve productos con variantes, marcas y rango de precios.
      </p>

      <div className="space-y-6">
        {/* Formulario */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-300">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Buscar término:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ej. leche, queso, pan"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Household ID (opcional):
              </label>
              <input
                type="text"
                value={householdId}
                onChange={(e) => setHouseholdId(e.target.value)}
                placeholder="UUID (sin esto: todas las tiendas)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">
                Si pasas household_id, se filtran tiendas según household_store_preferences
              </p>
            </div>

            <button
              onClick={handleSearch}
              disabled={isLoading}
              className="w-full px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition"
            >
              {isLoading ? "Buscando..." : "Buscar"}
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

        {/* Resultados */}
        {results.length > 0 ? (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-300 p-4 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Productos encontrados:</strong> {results.length}
              </p>
            </div>

            {results.map((product) => (
              <div key={product.product_catalog_id} className="bg-white p-6 rounded-lg shadow border border-gray-300">
                <h2 className="text-2xl font-bold text-gray-900">
                  {product.name}
                </h2>
                {product.category && (
                  <p className="text-sm text-gray-600">
                    Categoría: <strong>{product.category}</strong>
                  </p>
                )}

                {/* Variantes */}
                <div className="mt-6 space-y-4">
                  {product.variants.map((variant) => (
                    <div
                      key={variant.variant_id}
                      className="bg-gray-50 border border-gray-200 p-4 rounded-lg"
                    >
                      <p className="font-semibold text-gray-900 mb-2">
                        {variant.name}
                      </p>
                      <p className="text-xs text-gray-600 mb-3">
                        {variant.base_quantity} {variant.base_unit}
                      </p>

                      {/* Marcas */}
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Marcas:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {variant.brands.map((brand) => (
                            <span
                              key={brand.brand_id}
                              className="inline-block px-3 py-1 bg-indigo-100 text-indigo-900 text-xs rounded"
                            >
                              {brand.name}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Precios por tienda */}
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-2">
                          Rango de precios:
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {Object.entries(variant.price_ranges).map(
                            ([store, range]) => (
                              <div
                                key={store}
                                className="bg-white p-3 border border-gray-200 rounded text-center"
                              >
                                <p className="text-xs font-semibold text-gray-900 capitalize">
                                  {store}
                                </p>
                                <p className="text-sm text-green-600 font-bold">
                                  ₡{range.min.toLocaleString()} — ₡
                                  {range.max.toLocaleString()}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : !isLoading && !error ? (
          <div className="bg-gray-50 p-12 rounded-lg text-center">
            <p className="text-gray-600">
              Haz una búsqueda para ver resultados
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

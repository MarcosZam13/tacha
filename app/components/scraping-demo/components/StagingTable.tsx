"use client";

import type { StagingProduct } from "@/app/types/scraping.types";

interface StagingTableProps {
  rows: StagingProduct[];
  isLoading: boolean;
}

export const StagingTable = ({
  rows,
  isLoading,
}: StagingTableProps): JSX.Element | null => {
  if (isLoading || rows.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 border border-blue-300 rounded-lg p-6 bg-blue-50 mt-6 overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-900">
        Últimas {rows.length} filas en product_catalog_staging:
      </h3>

      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-blue-100 border-b-2 border-blue-300">
            <th className="px-4 py-2 text-left font-semibold text-gray-900">
              Nombre
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-900">
              Marca
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-900">
              Tamaño
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-900">
              Imagen
            </th>
            <th className="px-4 py-2 text-left font-semibold text-gray-900">
              Estado
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-blue-200 hover:bg-blue-100">
              <td className="px-4 py-2 text-gray-900">
                {row.scraped_name || "—"}
              </td>
              <td className="px-4 py-2 text-gray-700">
                {row.scraped_brand || "—"}
              </td>
              <td className="px-4 py-2 text-gray-700">
                {row.scraped_size_text || "—"}
              </td>
              <td className="px-4 py-2">
                {row.image_url ? (
                  <a
                    href={row.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Ver
                  </a>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2">
                <span
                  className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                    row.status === "pending"
                      ? "bg-yellow-100 text-yellow-900"
                      : row.status === "matched"
                        ? "bg-green-100 text-green-900"
                        : "bg-red-100 text-red-900"
                  }`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-gray-600">
        Nota: Los datos mostrados son el resultado crudo del scraping a VTEX,
        sin normalización. El status "pending" es normal — la conversión a
        catálogo normalizado es parte de spec-03.
      </p>
    </div>
  );
};

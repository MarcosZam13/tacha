"use client";

import type { JSX } from "react";
import type { EdgeFunctionIngestResponse } from "@/app/types/scraping.types";
import {
  SCRAPING_SOURCE_COLOR,
  SCRAPING_SOURCE_DISPLAY,
} from "@/app/constants";

interface ResultsDisplayProps {
  result: EdgeFunctionIngestResponse | null;
  isLoading: boolean;
  onViewStagingClick: () => void;
}

export const ResultsDisplay = ({
  result,
  isLoading,
  onViewStagingClick,
}: ResultsDisplayProps): JSX.Element | null => {
  if (isLoading || !result) {
    return null;
  }

  const sourceColor = SCRAPING_SOURCE_COLOR[result.source];
  const sourceDisplay = SCRAPING_SOURCE_DISPLAY[result.source];

  return (
    <div className="space-y-4 border border-green-300 rounded-lg p-6 bg-green-50">
      <h3 className="text-lg font-semibold text-gray-900">Resultados:</h3>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-gray-600">Query:</p>
          <p className="font-medium text-gray-900">{result.query}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Productos encontrados:</p>
          <p className="text-2xl font-bold text-green-600">
            {result.stagedCount}
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-600 mb-2">Origen de datos:</p>
        <div
          className={`px-4 py-3 rounded-md border-2 font-medium text-center ${sourceColor}`}
        >
          {sourceDisplay}
        </div>
      </div>

      {result.warning && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 px-4 py-3 rounded-md">
          <p className="font-medium">Advertencia:</p>
          <p>{result.warning}</p>
        </div>
      )}

      <button
        onClick={onViewStagingClick}
        className="w-full px-4 py-2 bg-gray-800 text-white font-medium rounded-md hover:bg-gray-900 transition"
      >
        Ver filas en staging
      </button>
    </div>
  );
};

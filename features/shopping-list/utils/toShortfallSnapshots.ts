import type { CatalogBaseUnitType } from "@/constants";
import { formatSizeLabel } from "@/utils/formatSizeLabel";
import type { ShortfallSnapshot, ShortfallSnapshotRow } from "../models/shortfall-resolution.types";

/** Filas de get_general_list_shortfall_snapshots → la foto de cada fila, por id (regla 46). */
export const toShortfallSnapshots = (snapshotRows: ShortfallSnapshotRow[]): Map<string, ShortfallSnapshot> =>
  new Map(
    snapshotRows.map((snapshotRow) => [
      snapshotRow.list_item_id,
      {
        previousQuantity: snapshotRow.previous_quantity_requested,
        // previous_base_unit es text en la base; el check de la columna garantiza que es una de las 3 unidades.
        previousSizeLabel: formatSizeLabel(
          snapshotRow.previous_base_quantity,
          snapshotRow.previous_base_unit as CatalogBaseUnitType,
        ),
      },
    ]),
  );

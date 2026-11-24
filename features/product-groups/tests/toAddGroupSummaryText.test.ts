import { describe, expect, it } from "vitest";
import { toAddGroupSummaryText } from "../utils/toAddGroupSummaryText";

describe("toAddGroupSummaryText", () => {
  it("says how many products of the group were added, in plural", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche", "Café", "Pan"], skipped: [] })).toEqual([
      "Agregamos 3 productos de «Desayuno» a tu lista.",
    ]);
  });

  it("uses the singular for one product", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche"], skipped: [] })).toEqual([
      "Agregamos 1 producto de «Desayuno» a tu lista.",
    ]);
  });

  // Caso 24: lo archivado o que ya no se puede ver se nombra aparte.
  it("names the products that were skipped", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche"], skipped: ["Natilla", "Queso"] })).toEqual([
      "Agregamos 1 producto de «Desayuno» a tu lista.",
      "No se agregaron: Natilla, Queso (ya no están disponibles).",
    ]);
  });

  it("says when nothing could be added", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: [], skipped: ["Natilla"] })).toEqual([
      "No se agregó ningún producto: los del grupo ya no están disponibles.",
      "No se agregaron: Natilla (ya no están disponibles).",
    ]);
  });
});

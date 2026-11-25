import { describe, expect, it } from "vitest";
import { toAddGroupSummaryText } from "../utils/toAddGroupSummaryText";

describe("toAddGroupSummaryText", () => {
  it("says how many products of the group were added, in plural", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche", "Café", "Pan"], personal: [], skipped: [] })).toEqual([
      "Agregamos 3 productos de «Desayuno» a tu lista.",
    ]);
  });

  it("uses the singular for one product", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche"], personal: [], skipped: [] })).toEqual([
      "Agregamos 1 producto de «Desayuno» a tu lista.",
    ]);
  });

  // Caso 24: lo archivado o que ya no se puede ver se nombra aparte.
  it("names the products that were skipped", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche"], personal: [], skipped: ["Natilla", "Queso"] })).toEqual([
      "Agregamos 1 producto de «Desayuno» a tu lista.",
      "No se agregaron: Natilla, Queso (ya no están disponibles).",
    ]);
  });

  it("says when nothing could be added", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: [], personal: [], skipped: ["Natilla"] })).toEqual([
      "No se agregó ningún producto: los del grupo ya no están disponibles.",
      "No se agregaron: Natilla (ya no están disponibles).",
    ]);
  });

  // SCRUM-163: personales sin compartir que no entran a la lista de la familia.
  it("names the personal products that the household list does not take", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: ["Leche"], personal: ["Tortillas", "Queso"], skipped: [] })).toEqual([
      "Agregamos 1 producto de «Desayuno» a tu lista.",
      "No se agregaron porque son solo tuyos y tu lista es la de tu familia: Tortillas, Queso.",
    ]);
  });

  it("says nothing was added when the group only had personal products", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: [], personal: ["Tortillas"], skipped: [] })).toEqual([
      "No se agregó ningún producto del grupo.",
      "No se agregaron porque son solo tuyos y tu lista es la de tu familia: Tortillas.",
    ]);
  });

  it("does not blame availability when personal products were left out too", () => {
    expect(toAddGroupSummaryText("Desayuno", { added: [], personal: ["Tortillas"], skipped: ["Natilla"] })).toEqual([
      "No se agregó ningún producto del grupo.",
      "No se agregaron: Natilla (ya no están disponibles).",
      "No se agregaron porque son solo tuyos y tu lista es la de tu familia: Tortillas.",
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { toPersonalProductNames } from "../utils/toPersonalProductNames";

const HINT = "recipe_personal_products";

describe("toPersonalProductNames", () => {
  it("reads the names of the error", () => {
    expect(toPersonalProductNames({ details: '["Pan","Miel"]', hint: HINT })).toEqual(["Pan", "Miel"]);
  });

  it.each([null, "x", new Error("network"), { details: "[]" }, { details: '["Pan"]', hint: "other" }, { hint: HINT }, { details: "no json", hint: HINT }, { details: "{}", hint: HINT }])(
    "is null with %j",
    (error) => {
      expect(toPersonalProductNames(error)).toBeNull();
    },
  );
});

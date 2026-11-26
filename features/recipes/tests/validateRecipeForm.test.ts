import { describe, expect, it } from "vitest";
import { hasRecipeFormErrors, validateRecipeForm } from "../utils/validateRecipeForm";
import { MILK, createValues } from "./recipe.fixtures";

describe("validateRecipeForm", () => {
  it("accepts a valid recipe", () => {
    const errors = validateRecipeForm(createValues());

    expect(errors).toEqual({
      baseServings: undefined,
      ingredients: undefined,
      name: undefined,
      quantityByProductId: {},
    });
    expect(hasRecipeFormErrors(errors)).toBe(false);
  });

  it("requires a name of up to 120 characters", () => {
    expect(validateRecipeForm(createValues({ name: "   " })).name).toBe("Escribe el nombre de la receta.");
    expect(validateRecipeForm(createValues({ name: "a".repeat(120) })).name).toBeUndefined();
    expect(validateRecipeForm(createValues({ name: "a".repeat(121) })).name).toBe(
      "El nombre puede tener hasta 120 caracteres.",
    );
  });

  it.each(["1", "50", " 4 "])("accepts %s servings", (baseServings) => {
    expect(validateRecipeForm(createValues({ baseServings })).baseServings).toBeUndefined();
  });

  it.each(["", "0", "51", "-1", "2.5", "2,5", "cuatro", "1e1"])("rejects %s servings", (baseServings) => {
    expect(validateRecipeForm(createValues({ baseServings })).baseServings).toBeDefined();
  });

  it("requires between 1 and 50 ingredients", () => {
    const createIngredients = (count: number) =>
      Array.from({ length: count }, (_, index) => ({ ...MILK, productId: `product-${index}` }));

    expect(validateRecipeForm(createValues({ ingredients: [] })).ingredients).toBe("Agrega al menos un ingrediente.");
    expect(validateRecipeForm(createValues({ ingredients: createIngredients(50) })).ingredients).toBeUndefined();
    expect(validateRecipeForm(createValues({ ingredients: createIngredients(51) })).ingredients).toBe(
      "La receta puede tener hasta 50 ingredientes.",
    );
  });

  it.each(["0,5", "0.5", "100000"])("accepts the quantity %s", (quantity) => {
    expect(validateRecipeForm(createValues({ ingredients: [{ ...MILK, quantity }] })).quantityByProductId).toEqual({});
  });

  it.each(["", "0", "-1", "abc", "100001", "1e5", "NaN", "Infinity"])("rejects the quantity %s", (quantity) => {
    const errors = validateRecipeForm(
      createValues({ ingredients: [{ ...MILK, quantity }, { ...MILK, productId: "sugar" }] }),
    );

    expect(Object.keys(errors.quantityByProductId)).toEqual(["milk"]);
    expect(hasRecipeFormErrors(errors)).toBe(true);
  });

  it("has errors when any field has one", () => {
    expect(hasRecipeFormErrors(validateRecipeForm(createValues({ name: "" })))).toBe(true);
    expect(hasRecipeFormErrors(validateRecipeForm(createValues({ baseServings: "" })))).toBe(true);
    expect(hasRecipeFormErrors(validateRecipeForm(createValues({ ingredients: [] })))).toBe(true);
  });
});

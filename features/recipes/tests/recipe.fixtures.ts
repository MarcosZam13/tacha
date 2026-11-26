import { CATALOG_BASE_UNIT } from "@/constants";
import type { RecipeEditorIngredient, RecipeEditorValues } from "../models/recipe-editor.interfaces";

export const MILK: RecipeEditorIngredient = {
  productId: "milk",
  productName: "Leche",
  quantity: "500",
  unit: CATALOG_BASE_UNIT.MILLILITERS,
};

/** Un formulario válido; cada test cambia solo lo suyo. */
export const createValues = (overrides: Partial<RecipeEditorValues> = {}): RecipeEditorValues => ({
  baseServings: "4",
  ingredients: [MILK],
  name: "Flan",
  ...overrides,
});

export const createPhotoFile = (type = "image/jpeg", content = "foto"): File => new File([content], "foto", { type });

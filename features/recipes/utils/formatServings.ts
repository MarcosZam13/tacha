import { RECIPE_TEXT } from "../constants/recipes.constants";

/** 4 → "4 porciones"; 1 → "1 porción". */
export const formatServings = (servings: number): string =>
  `${servings} ${servings === 1 ? RECIPE_TEXT.SERVINGS_SINGULAR : RECIPE_TEXT.SERVINGS_PLURAL}`;

import type { NullableRef } from "@/types/nullable.types";
import type { RecipeCoveragePanelStatusType } from "./recipe-coverage.types";

// Interfaces de "Ver qué falta" (SCRUM-98), en el orden en que se usan: lo que
// devuelve la base, la consulta, lo que ve la pantalla. Los types (la unión de
// estados) están en recipe-coverage.types.ts.

/**
 * Un ingrediente tal como lo devuelve la RPC get_recipe_coverage (017), tal
 * cual. Solo lo conoce el adapter (utils/toCoverageIngredients.ts). `status` y
 * `reason` llegan como texto: la base no les da tipo.
 */
export interface CoverageRow {
  ingredient_id: string;
  missing_quantity: NullableRef<number>;
  product_name: string;
  quantity_unit: string;
  quantity_value: number;
  reason: NullableRef<string>;
  status: string;
}

/** Lo que se manda para revisar una receta (nextjs-enterprise-patterns §4). Solo el id. */
export interface GetRecipeCoveragePayload {
  recipeId: string;
}

/** Un ingrediente listo para dibujar: los textos ya vienen armados. */
export interface CoverageIngredient {
  id: string;
  isCovered: boolean;
  name: string;
  /** "800 ml", "3 unidades". */
  quantityLabel: string;
  /** "Cubierto" o "Falta": se dice con texto, no solo con color. */
  statusLabel: string;
  /** Por qué falta ("No está en tu lista", "Te falta comprar 600 ml"); null si está cubierto. */
  reasonText: NullableRef<string>;
}

/** Lo que necesita una tarjeta para su botón "Ver qué falta" y su panel, ya calculado. */
export interface RecipeCardCoverage {
  /** Ingredientes del panel; vacío mientras no está en `ready`. */
  ingredients: CoverageIngredient[];
  /** Mensaje de error o de "no encontrada"; null si no hay. */
  messageText: NullableRef<string>;
  /** Id del panel, para el aria-controls del botón. */
  panelId: string;
  /**
   * Qué dibuja el panel (cargando, error, no encontrada o listo); null con el
   * panel cerrado. Es la única fuente de "está abierto": no hay un booleano aparte que se contradiga.
   */
  panelStatus: NullableRef<RecipeCoveragePanelStatusType>;
  /** "Te faltan 2 de 4 ingredientes" / "Tienes todo para cocinarla"; null fuera de `ready`. */
  summaryText: NullableRef<string>;
}

/** Lo que useRecipeCoverage le entrega al catálogo: el botón y el panel de cada tarjeta. */
export interface RecipeCoverageViewModel {
  /** Estado del botón y del panel de una tarjeta, ya calculado para esa receta. */
  getRecipeCoverage: (recipeId: string) => RecipeCardCoverage;
  onCoverageRetry: () => void;
  onCoverageToggle: (recipeId: string) => void;
  /** El catálogo avisa que una receta se borró: si su panel estaba abierto, se cierra y se cancela la suscripción. */
  onRecipeRemoved: (recipeId: string) => void;
}

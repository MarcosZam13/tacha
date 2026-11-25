// Chips de "cuánto le va a durar" al tachar en modo compra (SCRUM-103, HU-70b).

// Espejo del check de list_items.shelf_life_choice (migración 063).
export const SHELF_LIFE_CHOICE = {
  FEW_DAYS: "few_days",
  NO_EXPIRY: "no_expiry",
  ONE_TO_THREE_MONTHS: "one_to_three_months",
  TWO_TO_FOUR_WEEKS: "two_to_four_weeks",
} as const;

export type ShelfLifeChoiceType = (typeof SHELF_LIFE_CHOICE)[keyof typeof SHELF_LIFE_CHOICE];

// El orden de los chips en pantalla (HU-70b CA-01): de lo que dura menos a lo que no vence.
export const SHELF_LIFE_CHOICE_ORDER: readonly ShelfLifeChoiceType[] = [
  SHELF_LIFE_CHOICE.FEW_DAYS,
  SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS,
  SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS,
  SHELF_LIFE_CHOICE.NO_EXPIRY,
];

export const SHELF_LIFE_CHOICE_LABEL = {
  [SHELF_LIFE_CHOICE.FEW_DAYS]: "Vence en pocos días",
  [SHELF_LIFE_CHOICE.NO_EXPIRY]: "No vence / no aplica",
  [SHELF_LIFE_CHOICE.ONE_TO_THREE_MONTHS]: "1-3 meses",
  [SHELF_LIFE_CHOICE.TWO_TO_FOUR_WEEKS]: "2-4 semanas",
} as const satisfies Record<ShelfLifeChoiceType, string>;

export const SHELF_LIFE_TEXT = {
  // Nombre del grupo de chips; se completa con el producto: "¿Cuánto te va a durar Leche?".
  GROUP_LABEL_PREFIX: "¿Cuánto te va a durar",
  GROUP_LABEL_SUFFIX: "?",
  // Texto visible encima de los chips.
  HINT: "¿Cuánto te va a durar? (opcional)",
  SAVE_ERROR: "No se pudo guardar. Intenta de nuevo.",
} as const;

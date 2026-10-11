/** 1 → "1 comida"; 5 → "5 comidas". */
export const toCountLabel = (count: number, singular: string, plural: string): string =>
  `${count} ${count === 1 ? singular : plural}`;

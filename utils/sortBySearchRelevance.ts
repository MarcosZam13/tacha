// De más a menos relevante. Un número menor sale primero.
const RELEVANCE_RANK = {
  EXACT: 0,
  STARTS_WITH: 1,
  WORD_STARTS_WITH: 2,
  CONTAINS: 3,
} as const;

// Sin mayúsculas ni tildes: "Jabón" y "jabon" son lo mismo para comparar.
const normalizeForSearch = (text: string): string =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase()
    .trim();

const toRelevanceRank = (name: string, term: string): number => {
  if (name === term) return RELEVANCE_RANK.EXACT;
  if (name.startsWith(term)) return RELEVANCE_RANK.STARTS_WITH;
  if (name.split(/\s+/).some((word) => word.startsWith(term))) return RELEVANCE_RANK.WORD_STARTS_WITH;

  return RELEVANCE_RANK.CONTAINS;
};

/**
 * Ordena resultados de búsqueda por cuánto se parece su nombre a lo buscado: igual, empieza igual,
 * alguna palabra empieza igual y el resto. search_catalog los devuelve por orden alfabético, y con
 * el desplegable limitado a PRODUCT_SEARCH.MAX_VISIBLE_RESULTS (SCRUM-149) "leche" mostraba solo
 * presentaciones de "Crema de leche" y nunca la leche. El orden es estable: dentro de cada grupo
 * se mantiene el que traía la lista. Función pura: no cambia el arreglo que recibe.
 */
export const sortBySearchRelevance = <T>(items: readonly T[], searchTerm: string, getName: (item: T) => string): T[] => {
  const term = normalizeForSearch(searchTerm);
  if (term.length === 0) return [...items];

  return items
    .map((item, index) => ({ index, item, rank: toRelevanceRank(normalizeForSearch(getName(item)), term) }))
    .sort((first, second) => first.rank - second.rank || first.index - second.index)
    .map(({ item }) => item);
};

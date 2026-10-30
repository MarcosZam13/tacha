export interface CatalogEmptyStateProps {
  /** Mensaje principal; por defecto el de "sin resultados" de texto (CA-04). */
  message?: string;
  /** Abre CreateProductForm (CA-04, SCRUM-87) — lo trae CatalogSearch.tsx desde useCreateProductForm. */
  onAddProductClick: () => void;
}

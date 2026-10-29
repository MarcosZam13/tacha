import type { UseCreateProductFormReturn } from "@/hooks/useCreateProductForm";

// CreateProductForm es puramente presentacional: recibe exactamente lo que
// devuelve useCreateProductForm, ya calculado por quien lo abre (MyProducts.tsx
// o CatalogEmptyState.tsx vía CatalogSearch.tsx) — ninguna lógica propia.
export type CreateProductFormProps = UseCreateProductFormReturn;

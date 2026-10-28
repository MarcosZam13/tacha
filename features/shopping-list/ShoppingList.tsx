"use client";

import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { ShoppingListInner } from "./ShoppingListInner";

/**
 * Pantalla de la lista general. Solo pone la frontera <Suspense> que exige
 * Next.js para useSearchParams (el modo compra vive en ?compra=, SCRUM-67);
 * la pantalla en sí es ShoppingListInner. Container/Inner, component-architecture §5.
 */
export const ShoppingList = (): React.JSX.Element => (
  <Suspense fallback={<Spinner />}>
    <ShoppingListInner />
  </Suspense>
);

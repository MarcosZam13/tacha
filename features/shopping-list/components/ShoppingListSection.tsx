import type { ShoppingListSectionProps } from "./models/ShoppingListSectionProps.interface";

/**
 * Una sección de la lista ("Pendientes" o "Tachados hoy"): encabezado + <ul>.
 * Recibe las filas como children para no tener que conocer sus handlers; así
 * sirve igual a sublistas y listas privadas cuando existan (HU-36e CA-06).
 */
export const ShoppingListSection = ({ children, title }: ShoppingListSectionProps): React.JSX.Element => (
  <section aria-label={title} className="flex flex-col gap-2">
    <h2 className="font-display text-lg font-semibold text-tacha-text">{title}</h2>
    <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-badge border border-tacha-border bg-tacha-surface">
      {children}
    </ul>
  </section>
);

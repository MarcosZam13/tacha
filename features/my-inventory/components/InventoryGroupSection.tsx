import { useId } from "react";
import { InventoryItemRow } from "./InventoryItemRow";
import type { InventoryGroupSectionProps } from "./models/InventoryGroupSectionProps.interface";

/**
 * Un grupo de "Mi inventario" ("Vence pronto", "Este mes", "Más adelante",
 * "Sin fecha estimada"): una región con su título y la lista de productos
 * (CA-01, CA-02), cada uno con sus acciones (SCRUM-106).
 */
export const InventoryGroupSection = ({ actions, group }: InventoryGroupSectionProps): React.JSX.Element => {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-display text-lg font-semibold text-tacha-text">
        {group.title}
      </h2>
      <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-card border border-tacha-border bg-tacha-surface">
        {group.items.map((item) => (
          <InventoryItemRow key={item.variantId} item={item} actions={actions} />
        ))}
      </ul>
    </section>
  );
};

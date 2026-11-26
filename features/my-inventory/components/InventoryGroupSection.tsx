import { useId } from "react";
import type { InventoryGroupSectionProps } from "./models/InventoryGroupSectionProps.interface";

/**
 * Un grupo de "Mi inventario" ("Vence pronto", "Este mes", "Más adelante",
 * "Sin fecha estimada"): una región con su título y la lista de productos,
 * cada uno con su presentación y cuánto le queda (CA-01, CA-02).
 */
export const InventoryGroupSection = ({ group }: InventoryGroupSectionProps): React.JSX.Element => {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="font-display text-lg font-semibold text-tacha-text">
        {group.title}
      </h2>
      <ul className="flex flex-col divide-y divide-tacha-border rounded-tacha-card border border-tacha-border bg-tacha-surface">
        {group.items.map((item) => (
          <li key={item.variantId} className="flex items-center justify-between gap-3 px-3 py-2">
            <div className="flex min-w-0 flex-col">
              <span className="font-body text-sm font-semibold text-tacha-text">{item.productName}</span>
              <span className="font-body text-xs text-tacha-textsec">{item.sizeLabel}</span>
            </div>
            {item.remainingText ? (
              <span className="shrink-0 font-body text-xs text-tacha-textsec">{item.remainingText}</span>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
};

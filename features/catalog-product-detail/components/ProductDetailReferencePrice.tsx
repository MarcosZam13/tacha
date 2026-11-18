import { Info } from "lucide-react";
import { Icon } from "@/components/ui";
import { ICON_SIZE, REFERENCE_PRICE_TEXT } from "@/constants";
import type { ProductDetailReferencePriceProps } from "./models/ProductDetailReferencePriceProps.interface";

/**
 * Sección "Precio de referencia" de un producto personalizado (SCRUM-88 /
 * HU-57): la tienda y el precio que anotó el usuario, separados de los precios
 * por supermercado del scraping (CA-03). Con precio, el ícono "i" y el aviso
 * de CA-02 van visibles, no solo al pasar el mouse: en el celular no hay hover.
 */
export const ProductDetailReferencePrice = ({
  priceLabel,
  storeName,
}: ProductDetailReferencePriceProps): React.JSX.Element => (
  <section>
    <h2 className="font-body text-sm font-semibold text-tacha-text">{REFERENCE_PRICE_TEXT.TITLE}</h2>

    <div className="mt-2 flex items-center justify-between gap-3 rounded-tacha-card border border-tacha-border bg-tacha-surface px-3 py-2">
      <span className="font-body text-sm text-tacha-text">{storeName}</span>
      {priceLabel !== null ? (
        <span className="flex items-center gap-1 font-body text-sm font-semibold text-tacha-terracotta">
          {priceLabel}
          <Icon icon={Info} size={ICON_SIZE.SMALL} />
        </span>
      ) : null}
    </div>

    {priceLabel !== null ? (
      <p className="mt-1 font-body text-xs text-tacha-textsec">{REFERENCE_PRICE_TEXT.INFO}</p>
    ) : null}
  </section>
);

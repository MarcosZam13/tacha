import Image from "next/image";
import { PRODUCT_DETAIL_TEXT } from "../constants/catalog-product-detail.constants";
import { getStoreIconPath } from "../utils/getStoreIconPath";
import type { ProductDetailStorePricesProps } from "./models/ProductDetailStorePricesProps.interface";

/**
 * Sección "Precio aproximado por supermercado" (SPEC.md §5.1, 5.2): una fila
 * por supermercado con precio disponible, ya ordenadas de más barato a más
 * caro por el ViewModel (toStorePriceRanges). El ícono es decorativo
 * (SPEC.md §9): el nombre del supermercado va siempre en texto, con o sin
 * ícono reconocido.
 */
export const ProductDetailStorePrices = ({ storePriceRows }: ProductDetailStorePricesProps): React.JSX.Element => (
  <section>
    <h2 className="font-body text-sm font-semibold text-tacha-text">{PRODUCT_DETAIL_TEXT.PRICES_TITLE}</h2>

    {storePriceRows.length > 0 ? (
      <ul className="mt-2 flex flex-col gap-2">
        {storePriceRows.map((row) => {
          const iconPath = getStoreIconPath(row.storeSlug);

          return (
            <li
              key={row.storeName}
              className="flex items-center justify-between gap-3 rounded-tacha-card border border-tacha-border bg-tacha-surface px-3 py-2"
            >
              <span className="flex items-center gap-2 font-body text-sm text-tacha-text">
                {iconPath ? (
                  <Image src={iconPath} alt="" aria-hidden="true" width={20} height={20} />
                ) : null}
                {row.storeName}
              </span>
              <span className="font-body text-sm font-semibold text-tacha-terracotta">{row.priceLabel}</span>
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="mt-2 font-body text-sm text-tacha-textsec">{PRODUCT_DETAIL_TEXT.NO_PRICES}</p>
    )}
  </section>
);
